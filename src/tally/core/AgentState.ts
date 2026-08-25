import { ModifierRegistry, type ModifierHandle } from "../modifier/ModifierRegistry.js";
import { type AnyProperty, type Property } from "../property/Property.js";
import type { Source } from "../state/source/Source.js";
import { SourceType, type AnySourceType } from "../state/source/SourceType.js";
import { SourceInstance } from "../state/source/SourceInstance.js";
import { DescriptorType, type AnyDescriptorType } from "../state/descriptor/DescriptorType.js";
import type {
	AnyDescriptorBinding,
	DescriptorBinding,
} from "../state/descriptor/DescriptorBinding.js";
import { DescriptorInstance } from "../state/descriptor/DescriptorInstance.js";
import type { AnyDescriptor, Descriptor } from "../state/descriptor/Descriptor.js";
import type { SourceOption } from "../state/source/SourceOption.js";
import type {
	AnyDescriptorHandler,
	DescriptorHandler,
} from "../state/descriptor/DescriptorHandler.js";
import type { Disconnect } from "../util/Disconnect.js";
import type { DescriptorOption } from "../state/index.js";

type PropertyCallback<T = unknown> = (newValue: T, oldValue: T) => void;
type SourceCallback<T = unknown> = (source: Source<T>) => void;
type DescriptorCallback<TDescriptorData = unknown, TSourceData = unknown> = (
	descriptor: Descriptor<TDescriptorData, TSourceData>
) => void;

export class AgentState<TEntity> {
	private static readonly EmptySet: ReadonlySet<unknown> = new Set();

	private readonly modifierRegistry = new ModifierRegistry();
	private readonly sourceModifiersMap = new Map<Source, ModifierHandle[]>();
	private readonly descriptorHandlers = new Map<AnyDescriptorType, AnyDescriptorHandler>();

	private readonly sourceMap = new Map<AnySourceType, Set<Source>>();
	private readonly descriptorMap = new Map<AnyDescriptorType, Set<AnyDescriptor>>();

	private readonly propertyCallbacks = new Map<AnyProperty, Set<PropertyCallback>>();
	private readonly sourceAddedCallbacks = new Set<SourceCallback>();
	private readonly sourceRemovedCallbacks = new Set<SourceCallback>();
	private readonly sourceUpdatedCallbacks = new Set<SourceCallback>();
	private readonly descriptorAddedCallbacks = new Set<DescriptorCallback>();
	private readonly descriptorRemovedCallbacks = new Set<DescriptorCallback>();
	private readonly descriptorUpdatedCallbacks = new Set<DescriptorCallback>();

	private readonly resolvedProperties = new Map<AnyProperty, unknown>();
	private readonly dirtyProperties = new Set<AnyProperty>();

	private sourceCounter = 0;
	private mutationDepth = 0;

	constructor(public readonly entity: TEntity) {}

	addSource<TData extends undefined>(
		type: SourceType<TData>,
		data?: TData,
		options?: SourceOption
	): Source<TData> | undefined;
	addSource<TData>(
		type: SourceType<TData>,
		data: TData,
		options?: SourceOption
	): Source<TData> | undefined;
	addSource<TData>(
		type: SourceType<TData>,
		data: TData,
		options?: SourceOption
	): Source<TData> | undefined {
		switch (type.duplication.policy) {
			case "allow":
				return this.createSource(type, data, options);
			case "ignore": {
				const existingSource = this.sourceMap.get(type)?.values().next().value;
				if (existingSource) return undefined;
				return this.createSource(type, data, options);
			}
			case "replace": {
				return this.batch(() => {
					const existingSource = this.sourceMap.get(type)?.values().next().value;
					existingSource?.destroy();
					return this.createSource(type, data, options);
				});
			}
			case "reconcile": {
				const existingSource = this.sourceMap.get(type)?.values().next().value;
				if (!existingSource) return this.createSource(type, data, options);
				if (existingSource.type.duplication.policy !== "reconcile")
					throw new Error("Duplicate policy was changed");
				existingSource.type.duplication.reconcile(existingSource, data);
				return undefined;
			}
		}
	}

	addDescriptor<TDescriptorData, TSourceData>(
		type: DescriptorType<TDescriptorData, TSourceData>,
		data: TDescriptorData,
		options?: DescriptorOption
	): Descriptor<TDescriptorData, TSourceData> | undefined {
		// TODO: Handle priority
		switch (type.duplication.policy) {
			case "allow":
				return this.createDescriptor(type, data, options);
			case "ignore": {
				const existingDescriptor = this.descriptorMap.get(type)?.values().next().value;
				if (existingDescriptor) return undefined;
				return this.createDescriptor(type, data, options);
			}
			case "replace": {
				return this.batch(() => {
					const existingDescriptor = this.descriptorMap.get(type)?.values().next().value;
					existingDescriptor?.destroy();
					return this.createDescriptor(type, data, options);
				});
			}
			case "reconcile": {
				const existingDescriptor = this.descriptorMap.get(type)?.values().next().value;
				if (!existingDescriptor) return this.createDescriptor(type, data, options);
				if (existingDescriptor.type.duplication.policy !== "reconcile")
					throw new Error("Duplicate policy was changed");
				existingDescriptor.type.duplication.reconcile(existingDescriptor, data);
				return undefined;
			}
		}
	}

	registerDescriptorHandler<TDescriptorData, TSourceData>(
		type: DescriptorType<TDescriptorData, TSourceData>,
		handler: DescriptorHandler<TEntity, TDescriptorData, TSourceData>
	) {
		this.descriptorHandlers.set(type, handler as AnyDescriptorHandler);
	}

	private createSource<TData>(
		type: SourceType<TData>,
		data: TData,
		options?: SourceOption
	): SourceInstance<TData> {
		const priority = options?.priority ?? type.priority;
		const provenance = options?.provenance ?? {
			domain: "local",
			order: this.sourceCounter,
		};
		let handles = this.applyModifiers(type, priority, data);

		const source = new SourceInstance(this.sourceCounter++, type, priority, provenance, data);
		this.sourceModifiersMap.set(source, handles);
		for (const handle of handles) this.dirtyProperties.add(handle.property);
		this.requestResolve();

		this.sourceMap.getOrInsert(type, new Set()).add(source);

		source.onUpdate(() => {
			for (const handle of handles) this.dirtyProperties.add(handle.property);
			this.clearModifierHandles(handles);
			handles = this.applyModifiers(type, priority, source.get());
			this.sourceModifiersMap.set(source, handles);
			for (const handle of handles) this.dirtyProperties.add(handle.property);
			this.requestResolve();
			this.sourceUpdatedCallbacks.forEach((callback) => callback(source));
		});

		source.onDestroy(() => {
			for (const handle of handles) this.dirtyProperties.add(handle.property);
			this.clearModifierHandles(handles);
			this.sourceModifiersMap.delete(source);
			this.sourceMap.get(source.type)?.delete(source);
			this.requestResolve();
			this.sourceRemovedCallbacks.forEach((callback) => callback(source));
		});

		this.sourceAddedCallbacks.forEach((callback) => callback(source));

		return source;
	}

	private createDescriptor<TDescriptorData, TSourceData>(
		type: DescriptorType<TDescriptorData, TSourceData>,
		data: TDescriptorData,
		options?: DescriptorOption
	): Descriptor<TDescriptorData, TSourceData> | undefined {
		const handler = this.descriptorHandlers.get(type);
		if (!handler)
			throw new Error(
				"Attempted to add a descriptor source before a descriptor handler was assigned"
			);
		const binding = handler(
			{
				agent: this,
				addSource: (data, options) => {
					type Writable<T> = {
						-readonly [K in keyof T]: T[K];
					};
					const writableOptions: Writable<SourceOption> = {
						priority: type.source.priority,
						provenance: {
							domain: "descriptor",
							order: this.sourceCounter,
						},
					};
					if (options?.priority !== undefined)
						writableOptions.priority = options.priority;
					if (options?.provenance !== undefined)
						writableOptions.provenance = options.provenance;
					return this.addSource(type.source, data, writableOptions);
				},
			},
			data
		);
		if (!binding) return undefined;

		const provenance = options?.provenance ?? { domain: "local", order: this.sourceCounter };

		const descriptor = new DescriptorInstance<TDescriptorData, TSourceData>(
			this.sourceCounter++,
			type,
			provenance,
			binding as DescriptorBinding<TDescriptorData, TSourceData>,
			data
		);
		this.descriptorMap.getOrInsert(type, new Set()).add(descriptor);
		this.descriptorAddedCallbacks.forEach((callback) => callback(descriptor));

		descriptor.onUpdate(() =>
			this.descriptorUpdatedCallbacks.forEach((callback) => callback(descriptor))
		);

		descriptor.onDestroy(() => {
			this.descriptorMap.get(type)?.delete(descriptor);
			this.descriptorRemovedCallbacks.forEach((callback) => callback(descriptor));
		});

		return descriptor;
	}

	private applyModifiers<TData>(
		type: SourceType<TData>,
		priority: number,
		data: TData
	): ModifierHandle[] {
		return type
			.contribute(data)
			.map((modifier) => modifier.applyTo(this.modifierRegistry, priority));
	}

	private clearModifierHandles(handles: ModifierHandle[]) {
		for (const handle of handles) this.modifierRegistry.delete(handle);
		handles.length = 0;
	}

	private resolveProperties() {
		for (const property of this.dirtyProperties) {
			const newResolution = property.resolve(
				property.defaultValue,
				this.modifierRegistry.get(property)
			);
			const oldResolution = this.get(property);
			this.resolvedProperties.set(property, newResolution);
			if (!property.equals(oldResolution, newResolution)) {
				const callbacks = this.propertyCallbacks.get(property);
				callbacks?.forEach((callback) => callback(newResolution, oldResolution));
			}
		}
		this.dirtyProperties.clear();
	}

	get<T>(property: Property<T>): T {
		if (!this.resolvedProperties.has(property)) {
			this.resolvedProperties.set(property, property.defaultValue);
		}
		return this.resolvedProperties.get(property) as T;
	}

	onPropertyChanged<T>(property: Property<T>, callback: PropertyCallback<T>): Disconnect {
		let callbacks = this.propertyCallbacks.get(property);
		if (callbacks) {
			callbacks.add(callback as PropertyCallback<unknown>);
		} else {
			callbacks = new Set();
			this.propertyCallbacks.set(property, callbacks);
			callbacks.add(callback as PropertyCallback<unknown>);
		}

		return () => callbacks.delete(callback as PropertyCallback<unknown>);
	}

	hasSource(type: SourceType<unknown>): boolean {
		const existingSource = this.sourceMap.get(type)?.values().next().value;
		return existingSource !== undefined;
	}

	getSources(): ReadonlySet<Source>;
	getSources<TData>(type: SourceType<TData>): ReadonlySet<Source<TData>>;
	getSources(type?: SourceType<unknown>): ReadonlySet<Source> {
		if (type === undefined) return new Set(this.sourceModifiersMap.keys());
		return (this.sourceMap.get(type) ?? AgentState.EmptySet) as ReadonlySet<Source>;
	}

	getDescriptors(): ReadonlySet<AnyDescriptor>;
	getDescriptors<TDescriptorData, TSourceData>(
		type: DescriptorType<TDescriptorData, TSourceData>
	): ReadonlySet<Descriptor<TDescriptorData, TSourceData>>;
	getDescriptors(
		type?: DescriptorType<unknown, unknown>
	): ReadonlySet<Descriptor<unknown, unknown>> {
		if (type === undefined)
			return new Set(this.descriptorMap.values().flatMap((x) => x.values().toArray()));
		return (this.descriptorMap.get(type) ?? AgentState.EmptySet) as ReadonlySet<
			Descriptor<unknown, unknown>
		>;
	}

	onSourceAdded(callback: SourceCallback): Disconnect {
		this.sourceAddedCallbacks.add(callback);
		return () => this.sourceAddedCallbacks.delete(callback);
	}

	onSourceRemoved(callback: SourceCallback): Disconnect {
		this.sourceRemovedCallbacks.add(callback);
		return () => this.sourceRemovedCallbacks.delete(callback);
	}

	onSourceUpdated(callback: SourceCallback): Disconnect {
		this.sourceUpdatedCallbacks.add(callback);
		return () => this.sourceUpdatedCallbacks.delete(callback);
	}

	onDescriptorAdded(callback: DescriptorCallback): Disconnect {
		this.descriptorAddedCallbacks.add(callback);
		return () => this.descriptorAddedCallbacks.delete(callback);
	}

	onDescriptorRemoved(callback: DescriptorCallback): Disconnect {
		this.descriptorRemovedCallbacks.add(callback);
		return () => this.descriptorRemovedCallbacks.delete(callback);
	}

	onDescriptorUpdated(callback: DescriptorCallback): Disconnect {
		this.descriptorUpdatedCallbacks.add(callback);
		return () => this.descriptorUpdatedCallbacks.delete(callback);
	}

	destroyAllSources() {
		this.sourceModifiersMap.forEach((_, source) => source.destroy());
		this.sourceModifiersMap.clear();
		this.modifierRegistry.clear();
		this.resolvedProperties.clear();
		this.dirtyProperties.clear();
	}

	destroyAllDescriptors() {
		this.descriptorMap
			.values()
			.forEach((descriptors) => descriptors.forEach((x) => x.destroy()));
		this.descriptorMap.clear();
	}

	destroy() {
		this.destroyAllDescriptors();
		this.destroyAllSources();
		this.propertyCallbacks.clear();
		this.sourceAddedCallbacks.clear();
		this.sourceRemovedCallbacks.clear();
		this.sourceUpdatedCallbacks.clear();
	}

	private requestResolve() {
		if (this.mutationDepth === 0) this.resolveProperties();
	}

	batch<T>(callback: () => T): T {
		this.mutationDepth++;

		try {
			return callback();
		} finally {
			this.mutationDepth--;
			if (this.mutationDepth === 0) this.resolveProperties();
		}
	}
}

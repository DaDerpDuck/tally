import { ModifierRegistry, type ModifierHandle } from "../modifier/ModifierRegistry.js";
import { type AnyProperty, type Property } from "../property/Property.js";
import type { Source } from "../state/source/Source.js";
import { SourceType, type AnySourceType } from "../state/source/SourceType.js";
import { SourceInstance } from "../state/source/SourceInstance.js";
import { DescriptorType, type AnyDescriptorType } from "../state/descriptor/DescriptorType.js";
import type { DescriptorBinding } from "../state/descriptor/DescriptorBinding.js";
import { DescriptorInstance } from "../state/descriptor/DescriptorInstance.js";
import type { AnyDescriptor, Descriptor } from "../state/descriptor/Descriptor.js";
import type { SourceOption } from "../state/source/SourceOption.js";
import type {
	AnyDescriptorHandler,
	DescriptorHandler,
} from "../state/descriptor/DescriptorHandler.js";
import type { Disconnect } from "../util/Disconnect.js";
import { OrderingDomain } from "../modifier/OrderingDomain.js";
import type { DescriptorOption } from "../state/descriptor/DescriptorOption.js";
import type { StateProvenance } from "../state/Provenance.js";

type PropertyCallback<T = unknown> = (newValue: T, oldValue: T) => void;
type SourceCallback<T = unknown> = (source: Source<T>) => void;
type DescriptorCallback<TDescriptorData = unknown, TSourceData = unknown> = (
	descriptor: Descriptor<TDescriptorData, TSourceData>
) => void;
type DestroyCallback = () => void;

/**
 * Holds the runtime Tally state for a single entity.
 *
 * AgentState owns Sources, Descriptors, property resolution, and
 * lifecycle observation for the associated entity.
 */
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
	private readonly destroyCallbacks = new Set<DestroyCallback>();

	private readonly resolvedProperties = new Map<AnyProperty, unknown>();
	private readonly dirtyProperties = new Set<AnyProperty>();

	private sourceCounter = 0;
	private mutationDepth = 0;

	constructor(public readonly entity: TEntity) {}

	/**
	 * Adds a Source of the given type to this AgentState.
	 *
	 * The SourceType's duplication policy is applied before creation.
	 * The SourceType's default priority is used unless overridden.
	 *
	 * @returns The created Source, or `undefined` when rejected by
	 * the duplication policy.
	 */
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

	/**
	 * Adds a Descriptor of the given type to this AgentState. A handler must
	 * be registered prior to calling this method.
	 *
	 * The Descriptor's duplication policy is applied before creation.
	 *
	 * @returns The created Descriptor, or `undefined` if the handler
	 * rejects creation.
	 */
	addDescriptor<TDescriptorData, TSourceData>(
		type: DescriptorType<TDescriptorData, TSourceData>,
		data: TDescriptorData,
		options?: DescriptorOption
	): Descriptor<TDescriptorData, TSourceData> | undefined {
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

	/**
	 * Registers a local descriptor handler. If an AgentState was created through
	 * `TallyContext.createAgentState`, then TallyContext will register its registered
	 * descriptor handlers to this agent during creation.
	 *
	 * Can be used to override existing descriptor handlers.
	 */
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
			sequence: this.sourceCounter,
		};
		let handles = this.applyModifiers(type, priority, provenance, data);

		const source = new SourceInstance(this.sourceCounter++, type, priority, provenance, data);
		this.sourceModifiersMap.set(source, handles);
		for (const handle of handles) this.dirtyProperties.add(handle.property);
		this.requestResolve();

		this.sourceMap.getOrInsert(type, new Set()).add(source);

		source.onUpdate(() => {
			for (const handle of handles) this.dirtyProperties.add(handle.property);
			this.clearModifierHandles(handles);
			handles = this.applyModifiers(type, priority, source.provenance, source.get());
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

		const provenance = options?.provenance ?? {
			domain: "local",
			sequence: this.sourceCounter,
		};

		// Reserve id before handler is called.
		const descriptorId = this.sourceCounter++;

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
							domain:
								provenance.domain === "local"
									? "descriptor-local"
									: "descriptor-replicated",
							sequence: provenance.sequence,
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

		const descriptor = new DescriptorInstance<TDescriptorData, TSourceData>(
			descriptorId,
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
		provenance: StateProvenance,
		data: TData
	): ModifierHandle[] {
		return type.contribute(data).map((modifier, index) =>
			modifier.applyTo(this.modifierRegistry, {
				priority,
				domain:
					provenance.domain === "local" || provenance.domain === "descriptor-local"
						? OrderingDomain.local
						: OrderingDomain.authoritative,
				sequence: provenance.sequence,
				modifierIndex: index,
			})
		);
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
			if (!property.valueEquals(oldResolution, newResolution)) {
				const callbacks = this.propertyCallbacks.get(property);
				callbacks?.forEach((callback) => callback(newResolution, oldResolution));
			}
		}
		this.dirtyProperties.clear();
	}

	/**
	 * Resolves the current value of the passed Property.
	 *
	 * Property values are cached at resolution, so calling this method only performs
	 * a simply lookup.
	 *
	 * Warning: Calling this within a {@link batch} call will get the resolved property
	 * from when the batch call began. This may result in retrieving stale data.
	 */
	get<T>(property: Property<T>): T {
		return (this.resolvedProperties.get(property) as T) ?? property.defaultValue;
	}

	/**
	 * Fires when a property changes to a value different from its previous value.
	 * Property equality is determined through {@link Property.valueEquals}.
	 *
	 * During a {@link batch} call, rather than firing for every intermediate property
	 * change, property resolution is deferred to the end of the batch call.
	 */
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

	/**
	 * Retrieves all active Sources or all active Sources of a given type if
	 * one is passed.
	 */
	getSources(): ReadonlySet<Source>;
	getSources<TData>(type: SourceType<TData>): ReadonlySet<Source<TData>>;
	getSources(type?: SourceType<unknown>): ReadonlySet<Source> {
		if (type === undefined) return new Set(this.sourceModifiersMap.keys());
		return (this.sourceMap.get(type) ?? AgentState.EmptySet) as ReadonlySet<Source>;
	}

	/**
	 * Retrieves all active Descriptors or all active Descriptors of a given type
	 * if one is passed.
	 */
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

	onDestroy(callback: DestroyCallback): Disconnect {
		this.destroyCallbacks.add(callback);
		return () => this.destroyCallbacks.delete(callback);
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

	/**
	 * Destroys all active Sources and Descriptors, then disconnects all callbacks.
	 *
	 * Does not prevent future mutations, so you can reuse a "destroyed" AgentState
	 * if you desire.
	 */
	destroy() {
		this.destroyCallbacks.forEach((callback) => callback());
		this.destroyAllDescriptors();
		this.destroyAllSources();
		this.propertyCallbacks.clear();
		this.sourceAddedCallbacks.clear();
		this.sourceRemovedCallbacks.clear();
		this.sourceUpdatedCallbacks.clear();
		this.descriptorAddedCallbacks.clear();
		this.descriptorRemovedCallbacks.clear();
		this.descriptorUpdatedCallbacks.clear();
		this.destroyCallbacks.clear();
	}

	private requestResolve() {
		if (this.mutationDepth === 0) this.resolveProperties();
	}

	/**
	 * Defers property resolution until the outermost batch completes. Callbacks
	 * are only fired once when the resolution completes.
	 *
	 * Nested batches are supported.
	 */
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

import { ModifierRegistry, type ModifierHandle } from "../modifier/ModifierRegistry.js";
import { Property } from "../property/Property.js";
import type { Source } from "../source/Source.js";
import { SourceType } from "../source/SourceType.js";
import { StaticSource } from "../source/StaticSource.js";

type Disconnect = () => void;
type PropertyCallback<T> = (newValue: T, oldValue: T) => void;
type SourceCallback<T> = (source: Source<T>) => void;

export class AgentState<TEntity> {
	private readonly modifierRegistry = new ModifierRegistry();
	private readonly sourceModifiersMap = new Map<Source<unknown>, ModifierHandle[]>();
	private readonly duplicateLookup = new Map<SourceType<unknown>, Set<Source<unknown>>>();

	private readonly propertyCallbacks = new Map<
		Property<unknown>,
		Set<PropertyCallback<unknown>>
	>();
	private readonly sourceAddedCallbacks = new Set<SourceCallback<unknown>>();
	private readonly sourceRemovedCallbacks = new Set<SourceCallback<unknown>>();
	private readonly sourceUpdatedCallbacks = new Set<SourceCallback<unknown>>();

	private readonly resolvedProperties = new Map<Property<unknown>, unknown>();
	private readonly dirtyProperties = new Set<Property<unknown>>();

	private mutationDepth = 0;

	constructor(public readonly entity: TEntity) {}

	addSource(type: SourceType<undefined>, priority: number): Source<undefined> | undefined;
	addSource<TData extends object>(
		type: SourceType<TData>,
		priority: number,
		data: TData
	): Source<TData> | undefined;
	addSource<TData>(
		type: SourceType<TData>,
		priority: number,
		data?: TData
	): Source<TData | undefined> | undefined {
		switch (type.definition.duplicatePolicy) {
			case "allow":
				return this.createSource(type, priority, data);
			case "ignore": {
				const existingSource = this.duplicateLookup.get(type)?.values().next().value;
				if (existingSource) return undefined;
				return this.createSource(type, priority, data);
			}
			case "replace": {
				return this.transact(() => {
					const existingSource = this.duplicateLookup.get(type)?.values().next().value;
					existingSource?.destroy();
					return this.createSource(type, priority, data);
				});
			}
			case "reconcile": {
				const existingSource = this.duplicateLookup.get(type)?.values().next().value;
				if (!existingSource) return this.createSource(type, priority, data);
				existingSource.type.definition.reconcile!(existingSource, data);
				return undefined;
			}
		}
	}

	private createSource<TData>(
		type: SourceType<TData>,
		priority: number,
		data: TData
	): StaticSource<TData> {
		let handles = this.applyModifiers(type, priority, data);

		const source = new StaticSource(type, priority, data);
		this.sourceModifiersMap.set(source, handles);
		for (const handle of handles) this.dirtyProperties.add(handle.property);
		this.requestResolve();

		if (this.duplicateLookup.has(type)) this.duplicateLookup.get(type)!.add(source);
		else this.duplicateLookup.set(type, new Set([source]));

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
			this.duplicateLookup.get(source.type)?.delete(source);
			this.requestResolve();
			this.sourceRemovedCallbacks.forEach((callback) => callback(source));
		});

		this.sourceAddedCallbacks.forEach((callback) => callback(source));

		return source;
	}

	private applyModifiers<TData>(
		type: SourceType<TData>,
		priority: number,
		data: TData
	): ModifierHandle[] {
		return type.definition
			.create(data)
			.modifiers.map((modifier) => modifier.applyTo(this.modifierRegistry, priority));
	}

	private clearModifierHandles(handles: ModifierHandle[]) {
		for (const handle of handles) this.modifierRegistry.delete(handle);
		handles.length = 0;
	}

	private resolveProperties() {
		for (const property of this.dirtyProperties) {
			const newResolution = property.resolve(
				property.options.defaultValue,
				this.modifierRegistry.get(property)
			);
			const oldResolution = this.get(property);
			this.resolvedProperties.set(property, newResolution);
			if (oldResolution !== newResolution) {
				const callbacks = this.propertyCallbacks.get(property);
				callbacks?.forEach((callback) => callback(newResolution, oldResolution));
			}
		}
		this.dirtyProperties.clear();
	}

	get<T>(property: Property<T>): T {
		if (!this.resolvedProperties.has(property as Property<unknown>)) {
			this.resolvedProperties.set(
				property as Property<unknown>,
				property.options.defaultValue
			);
		}
		return this.resolvedProperties.get(property as Property<unknown>) as T;
	}

	observe<T>(property: Property<T>, callback: PropertyCallback<T>): Disconnect {
		let callbacks = this.propertyCallbacks.get(property as Property<unknown>);
		if (callbacks) {
			callbacks.add(callback as PropertyCallback<unknown>);
		} else {
			callbacks = new Set();
			this.propertyCallbacks.set(property as Property<unknown>, callbacks);
			callbacks.add(callback as PropertyCallback<unknown>);
		}

		return () => callbacks.delete(callback as PropertyCallback<unknown>);
	}

	hasSource(type: SourceType<unknown>): boolean {
		const existingSource = this.duplicateLookup.get(type)?.values().next().value;
		return existingSource !== undefined;
	}

	getSource<TData>(type: SourceType<TData>): ReadonlySet<Source<TData>> {
		if (!this.duplicateLookup.has(type)) this.duplicateLookup.set(type, new Set());
		return this.duplicateLookup.get(type)! as ReadonlySet<Source<TData>>;
	}

	getAllSources(): Set<Source<unknown>> {
		return new Set(this.sourceModifiersMap.keys().toArray());
	}

	onSourceAdded(callback: SourceCallback<unknown>): Disconnect {
		this.sourceAddedCallbacks.add(callback);
		return () => this.sourceAddedCallbacks.delete(callback);
	}

	onSourceRemoved(callback: SourceCallback<unknown>): Disconnect {
		this.sourceRemovedCallbacks.add(callback);
		return () => this.sourceRemovedCallbacks.delete(callback);
	}

	onSourceUpdated(callback: SourceCallback<unknown>): Disconnect {
		this.sourceUpdatedCallbacks.add(callback);
		return () => this.sourceUpdatedCallbacks.delete(callback);
	}

	destroyAllSources() {
		this.sourceModifiersMap.forEach((_, source) => source.destroy());
		this.sourceModifiersMap.clear();
		this.modifierRegistry.clear();
		this.resolvedProperties.clear();
		this.dirtyProperties.clear();
	}

	destroy() {
		this.destroyAllSources();
		this.propertyCallbacks.clear();
		this.sourceAddedCallbacks.clear();
		this.sourceRemovedCallbacks.clear();
		this.sourceUpdatedCallbacks.clear();
	}

	private requestResolve() {
		if (this.mutationDepth === 0) this.resolveProperties();
	}

	private transact<T>(callback: () => T): T {
		this.mutationDepth++;

		try {
			return callback();
		} finally {
			this.mutationDepth--;
			if (this.mutationDepth === 0) this.resolveProperties();
		}
	}
}

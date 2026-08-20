import { ModifierRegistry, type ModifierHandle } from "../modifier/ModifierRegistry.js";
import { Property } from "../property/Property.js";
import type { Source } from "../source/Source.js";
import { SourceType } from "../source/SourceType.js";
import { StaticSource } from "../source/StaticSource.js";

type Disconnect = () => void;
type PropertyCallback<T> = (newValue: T, oldValue: T) => void;

export class AgentState {
	private readonly modifierRegistry = new ModifierRegistry();
	private readonly sourceModifiersMap = new Map<Source<unknown>, ModifierHandle[]>();
	private readonly duplicateLookup = new Map<SourceType<unknown>, Set<Source<unknown>>>();

	private readonly propertyCallbacks = new Map<
		Property<unknown>,
		Set<PropertyCallback<unknown>>
	>();

	private readonly resolvedProperties = new Map<Property<unknown>, unknown>();
	private readonly dirtyProperties = new Set<Property<unknown>>();

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
	): Source<TData> | undefined {
		switch (type.definition.duplicatePolicy) {
			case "allow":
				return this.createSource(type, priority, data);
			case "ignore": {
				const existingSource = this.duplicateLookup.get(type)?.values().next().value;
				if (existingSource) return undefined;
				return this.createSource(type, priority, data);
			}
			case "replace": {
				const existingSource = this.duplicateLookup.get(type)?.values().next().value;
				existingSource?.destroy();
				return this.createSource(type, priority, data);
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
		this.resolveProperties();

		if (this.duplicateLookup.has(type)) this.duplicateLookup.get(type)!.add(source);
		else this.duplicateLookup.set(type, new Set([source]));

		source.onUpdate(() => {
			this.clearModifierHandles(handles);
			handles = this.applyModifiers(type, priority, source.data);
			this.sourceModifiersMap.set(source, handles);
			for (const handle of handles) this.dirtyProperties.add(handle.property);
			this.resolveProperties();
		});

		source.onDestroy(() => {
			for (const handle of handles) this.dirtyProperties.add(handle.property);
			this.clearModifierHandles(handles);
			this.sourceModifiersMap.delete(source);
			this.duplicateLookup.get(source.type)?.delete(source);
			this.resolveProperties();
		});

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
	}

	get<T>(property: Property<T>): T {
		let resolved = this.resolvedProperties.get(property as Property<unknown>);
		if (!resolved) {
			this.resolvedProperties.set(
				property as Property<unknown>,
				property.options.defaultValue
			);
			resolved = property.options.defaultValue;
		}
		return resolved as T;
	}

	observe<T>(property: Property<T>, callback: (value: T) => void): Disconnect {
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
		return this.duplicateLookup.get(type)!;
	}
}

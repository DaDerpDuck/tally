import type { Registrable, Registry } from "../core/Registrable.js";
import type { Modifier } from "../modifier/Modifier.js";

export interface PropertyDefinition<T> {
	readonly name: string;
	readonly defaultValue: T;
	equals?(a: T, b: T): boolean;
	resolve?: (base: T, modifiers: readonly Modifier<T>[]) => T;
}

export class Property<T> implements Registrable {
	public readonly name: string;
	public readonly defaultValue: T;

	constructor(private readonly definition: PropertyDefinition<T>) {
		this.name = definition.name;
		this.defaultValue = definition.defaultValue;
	}

	resolve(base: T, modifiers: readonly Modifier<T>[]): T {
		if ("resolve" in this.definition) return this.definition.resolve(base, modifiers);
		return this.defaultResolve(base, modifiers);
	}

	equals(a: T, b: T): boolean {
		return this.definition.equals?.(a, b) ?? this.defaultEquals(a, b);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected defaultResolve(base: T, modifiers: readonly Modifier<T>[]): T {
		return base;
	}

	protected defaultEquals(a: T, b: T): boolean {
		return a === b;
	}

	register(registry: Registry): void {
		if (registry.properties.has(this.name) && registry.properties.get(this.name) !== this)
			throw new Error(`Duplicate property name: ${this.name}`);
		registry.properties.set(this.name, this as Property<unknown>);
	}
}

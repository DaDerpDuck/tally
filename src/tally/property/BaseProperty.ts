import type { Modifier } from "../modifier/Modifier.js";
import type { Registrable, Registry } from "../state/Registrable.js";
import type { Property } from "./Property.js";

/**
 * Defines a Property's default value, equality behavior, and resolution logic.
 */
export interface PropertyDefinition<T> {
	readonly name: string;
	/** Base value for a Property that further Modifiers can affect off of. */
	readonly defaultValue: T;
	/**
	 * Determines whether two resolved values are considered equivalent.
	 *
	 * Used to decide whether property-change callbacks should fire.
	 */
	valueEquals?(a: T, b: T): boolean;
	/**
	 * Resolves the final Property value from the base value and ordered Modifiers.
	 *
	 * If omitted, the Property implementation's default resolution behavior is used.
	 */
	resolve?: (base: T, modifiers: readonly Modifier<T>[]) => T;
}

/**
 * Base implementation for defining custom Properties.
 *
 * Subclasses may override default resolution and equality behavior while still
 * allowing those behaviors to be replaced through {@link PropertyDefinition}.
 */
export class BaseProperty<T, TModifier extends Modifier<T> = Modifier<T>>
	implements Property<T, TModifier>, Registrable
{
	public readonly name: string;
	public readonly defaultValue: T;

	constructor(private readonly definition: PropertyDefinition<T>) {
		this.name = definition.name;
		this.defaultValue = definition.defaultValue;
	}

	resolve(base: T, modifiers: readonly TModifier[]): T {
		if ("resolve" in this.definition) return this.definition.resolve(base, modifiers);
		return this.defaultResolve(base, modifiers);
	}

	valueEquals(a: T, b: T): boolean {
		return this.definition.valueEquals?.(a, b) ?? this.defaultEquals(a, b);
	}

	protected defaultResolve(base: T, modifiers: readonly TModifier[]): T {
		return base;
	}

	protected defaultEquals(a: T, b: T): boolean {
		return Object.is(a, b);
	}

	register(registry: Registry): void {
		if (registry.properties.has(this.name) && registry.properties.get(this.name) !== this)
			throw new Error(`Duplicate property name: ${this.name}`);
		registry.properties.set(this.name, this);
	}
}

import type { AnyModifier, Modifier } from "../modifier/Modifier.js";

export interface AnyProperty {
	readonly name: string;
	readonly defaultValue: unknown;
	equals(a: unknown, b: unknown): boolean;
	resolve(base: unknown, modifiers: readonly AnyModifier[]): unknown;
}

/**
 * Represents a value that can be resolved from a default value and an ordered
 * collection of Modifiers.
 *
 * Properties are immutable definitions. AgentState cache the currently
 * resolved value for each Property they evaluate.
 *
 * Properties do not store per-agent state themselves and are reusable definitions.
 * Each AgentState resolves and caches its own value for a Property.
 */
export interface Property<T> extends AnyProperty {
	readonly name: string;
	readonly defaultValue: T;
	equals(a: T, b: T): boolean;
	resolve(base: T, modifiers: readonly Modifier<T>[]): T;
}

import type { AnyModifier, Modifier } from "../modifier/Modifier.js";

export interface AnyProperty {
	readonly name: string;
	readonly defaultValue: unknown;
	equals(a: unknown, b: unknown): boolean;
	resolve(base: unknown, modifiers: readonly AnyModifier[]): unknown;
}

export interface Property<T> extends AnyProperty {
	readonly name: string;
	readonly defaultValue: T;
	equals(a: T, b: T): boolean;
	resolve(base: T, modifiers: readonly Modifier<T>[]): T;
}

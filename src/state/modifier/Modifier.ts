import type { AnyProperty, Property } from "../property/Property.js";

export interface AnyModifier {
	readonly property: AnyProperty;
	readonly operation: string;
	readonly value: unknown;
}

export interface Modifier<T> extends AnyModifier {
	readonly property: Property<T>;
	readonly operation: string;
	readonly value: unknown;
}

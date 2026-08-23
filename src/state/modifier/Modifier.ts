import type { Property } from "../property/Property.js";

export interface Modifier<T> {
	readonly property: Property<T>;
	readonly operation: string;
	readonly value: unknown;
}

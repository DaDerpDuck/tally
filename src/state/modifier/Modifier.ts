import type { Property } from "../property/Property.js";

export interface Modifier<T> {
	property: Property<T>;
	operation: string;
	value: unknown;
}

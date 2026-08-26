import type { Property } from "../property/Property.js";
import type { Modifier } from "./Modifier.js";
import type { ModifierOrder } from "./ModifierOrder.js";
import type { ModifierHandle } from "./ModifierRegistry.js";

export interface ModifierCollection {
	add<T>(property: Property<T>, modifier: Modifier<T>, order: ModifierOrder): ModifierHandle;
	get<T>(property: Property<T>): readonly Modifier<T>[];
	iterator<T>(property: Property<T>): Generator<Modifier<T>>;
	delete(handle: unknown): boolean;
}

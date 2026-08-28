import type { Property } from "../property/Property.js";
import type { Modifier } from "./Modifier.js";
import type { ModifierOrder } from "./ModifierOrder.js";
import type { ModifierHandle } from "./ModifierRegistry.js";

export interface ModifierCollection {
	add<T>(property: Property<T>, modifier: Modifier<T>, order: ModifierOrder): ModifierHandle;
	get<T, TModifier extends Modifier<T>>(property: Property<T, TModifier>): readonly TModifier[];
	iterator<T, TModifier extends Modifier<T>>(
		property: Property<T, TModifier>
	): Generator<TModifier>;
	delete(handle: unknown): boolean;
}

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

export interface ModifierContribution {
	applyTo(registry: ModifierCollection, order: ModifierOrder): ModifierHandle;
}

export function contributeModifier<T>(modifier: Modifier<T>): ModifierContribution {
	return {
		applyTo(registry, order) {
			return registry.add(modifier.property, modifier, order);
		},
	};
}

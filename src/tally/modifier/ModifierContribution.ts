import type { Modifier } from "./Modifier.js";
import type { ModifierCollection } from "./ModifierCollection.js";
import type { ModifierOrder } from "./ModifierOrder.js";
import type { ModifierHandle } from "./ModifierRegistry.js";

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

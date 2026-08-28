import type { AnyProperty, Property } from "../property/Property.js";
import type { Modifier } from "./Modifier.js";
import type { ModifierCollection } from "./ModifierCollection.js";
import { SortedArray } from "../util/SortedArray.js";
import type { ModifierOrder } from "./ModifierOrder.js";

export interface ModifierHandle {
	readonly property: AnyProperty;
	readonly handle: {
		readonly modifier: unknown;
		readonly order: ModifierOrder;
	};
}

export class ModifierRegistry implements ModifierCollection {
	private readonly map = new Map<unknown, SortedArray<unknown, ModifierOrder>>();

	add<T>(property: Property<T>, modifier: Modifier<T>, order: ModifierOrder): ModifierHandle {
		if (modifier.property !== property) throw new Error("Modifier does not belong to Property");
		const sarray = this.map.get(property);
		if (sarray) {
			return {
				property: property,
				handle: { modifier: sarray.insert(modifier, order), order },
			};
		} else {
			const newSarray = new SortedArray<unknown, ModifierOrder>((a, b) => {
				if (a.priority !== b.priority) return a.priority - b.priority;
				if (a.domain !== b.domain) return a.domain - b.domain;
				if (a.sequence !== b.sequence) return a.sequence - b.sequence;
				return a.modifierIndex - b.modifierIndex;
			});
			const handle = { modifier: newSarray.insert(modifier, order), order };
			this.map.set(property, newSarray);
			return {
				property: property,
				handle,
			};
		}
	}

	get<T, TModifier extends Modifier<T>>(property: Property<T, TModifier>): readonly TModifier[] {
		return (this.map.get(property)?.values() ?? []) as readonly TModifier[];
	}

	*iterator<T, TModifier extends Modifier<T>>(
		property: Property<T, TModifier>
	): Generator<TModifier> {
		const sarray = this.map.get(property);
		if (!sarray) return;
		for (const entry of sarray.iterateAscending()) yield entry as TModifier;
	}

	delete(handle: ModifierHandle): boolean {
		const property = handle.property;
		const sarray = this.map.get(property);
		if (!sarray) return false;
		const deleted = sarray.delete(handle.handle.modifier, handle.handle.order);
		if (sarray.size() === 0) this.map.delete(property);
		return deleted;
	}

	clear() {
		this.map.clear();
	}
}

import { OrderedBuckets } from "../core/OrderedBuckets.js";
import { Property } from "../property/Property.js";
import type { Modifier } from "./Modifier.js";
import type { ModifierCollection } from "./ModifierContribution.js";

export interface ModifierHandle {
	readonly property: Property<unknown>;
	readonly handle: unknown;
};

export class ModifierRegistry implements ModifierCollection {
	private readonly map = new Map<unknown, OrderedBuckets<unknown>>();

	add<T>(property: Property<T>, modifier: Modifier<T>, priority: number): ModifierHandle {
		if (modifier.property !== property) throw new Error("Modifier does not belong to Property");
		const buckets = this.map.get(property);
		if (buckets) {
			return {
				property: property as Property<unknown>,
				handle: buckets.insert(modifier, priority),
			};
		} else {
			const newBuckets = new OrderedBuckets();
			const handle = newBuckets.insert(modifier, priority);
			this.map.set(property, newBuckets);
			return {
				property: property as Property<unknown>,
				handle,
			};
		}
	}

	get<T>(property: Property<T>): readonly Modifier<T>[] {
		return (this.map.get(property)?.values() ?? []) as readonly Modifier<T>[];
	}

	*iterator<T>(property: Property<T>): Generator<Modifier<T>> {
		const buckets = this.map.get(property);
		if (!buckets) return;
		for (const entry of buckets.iterateAscending()) yield entry.value as Modifier<T>;
	}

	delete(handle: ModifierHandle): boolean {
		const property = handle.property;
		const buckets = this.map.get(property);
		if (!buckets) return false;
		const deleted = buckets.delete(handle.handle as never);
		if (buckets.size() === 0) this.map.delete(property);
		return deleted;
	}

	clear() {
		this.map.clear();
	}
}

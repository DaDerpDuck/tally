import { describe, expect, it } from "vitest";
import { defineNumberProperty } from "../src";
import { ModifierOrder } from "../../src/tally/modifier/ModifierOrder";
import { ModifierRegistry } from "../../src/tally/modifier/ModifierRegistry";
import { OrderingDomain } from "../../src/tally/modifier/OrderingDomain";

const MovementSpeed = defineNumberProperty({
	name: "MovementSpeed",
	defaultValue: 16,
});

const defaultOrder: ModifierOrder = {
	priority: 0,
	domain: OrderingDomain.local,
	sequence: 0,
	modifierIndex: 0,
};

function resolve(registry: ModifierRegistry, base = 16) {
	return MovementSpeed.resolve(base, registry.get(MovementSpeed));
}

describe("number property", () => {
	it("returns the base value with no modifiers", () => {
		expect(MovementSpeed.resolve(16, [])).toBe(16);
	});

	it.each([
		["add", () => MovementSpeed.add(5), 21],
		["multiply", () => MovementSpeed.multiply(1.5), 24],
		["override", () => MovementSpeed.override(3), 3],
	] as const)("resolves a single %s modifier", (_, createModifier, expected) => {
		const registry = new ModifierRegistry();
		createModifier().applyTo(registry, defaultOrder);

		expect(resolve(registry)).toBe(expected);
	});

	it("combines modifiers within the same priority in insertion order", () => {
		const registry = new ModifierRegistry();

		MovementSpeed.add(1).applyTo(registry, defaultOrder);
		MovementSpeed.add(2).applyTo(registry, defaultOrder);
		MovementSpeed.add(3).applyTo(registry, defaultOrder);

		expect(resolve(registry)).toBe(22);
	});

	it("preserves order-dependent operations within the same priority", () => {
		const registry = new ModifierRegistry();

		MovementSpeed.override(2).applyTo(registry, defaultOrder);
		MovementSpeed.add(5).applyTo(registry, defaultOrder);
		MovementSpeed.override(3).applyTo(registry, defaultOrder);

		expect(resolve(registry)).toBe(3);
	});

	it("resolves modifiers by priority instead of insertion order", () => {
		const registry = new ModifierRegistry();

		MovementSpeed.override(3).applyTo(registry, { ...defaultOrder, priority: 300 });
		MovementSpeed.add(5).applyTo(registry, { ...defaultOrder, priority: 200 });
		MovementSpeed.override(2).applyTo(registry, { ...defaultOrder, priority: 100 });

		expect(resolve(registry)).toBe(3);
	});
});

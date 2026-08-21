import { describe, it, expect } from "vitest";
import { defineNumberProperty, ModifierRegistry } from "../src";

describe("number property", () => {
	const MovementSpeed = defineNumberProperty({
		name: "MovementSpeed",
		defaultValue: 16,
	});

	it("resolves zero modifiers", () => {
		expect(MovementSpeed.resolve(16, [])).toBe(16);
	});

	it("resolves single add modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		MovementSpeed.add(5).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(16 + 5);
	});

	it("resolves single multiply modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		MovementSpeed.multiply(1.5).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(16 * 1.5);
	});

	it("resolves multiple modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		MovementSpeed.add(1).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(16 + 1);

		MovementSpeed.add(2).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(16 + 1 + 2);

		MovementSpeed.add(3).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(16 + 1 + 2 + 3);
	});

	it("resolves multiple order-dependent modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		MovementSpeed.override(2).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(2);

		MovementSpeed.add(5).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(7);

		MovementSpeed.override(3).applyTo(modifierRegistry, 0);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(3);
	});

	it("resolves multiple priority-dependent modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		MovementSpeed.override(3).applyTo(modifierRegistry, 300);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(3);

		MovementSpeed.add(5).applyTo(modifierRegistry, 200);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(3);

		MovementSpeed.override(2).applyTo(modifierRegistry, 100);
		expect(MovementSpeed.resolve(16, modifierRegistry.get(MovementSpeed))).toBe(3);
	});
});

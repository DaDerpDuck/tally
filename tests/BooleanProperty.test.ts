import { describe, it, expect } from "vitest";
import { defineBooleanProperty, ModifierRegistry } from "../src";

describe("number property", () => {
	enum PropertyId {
		Invisibility,
	}

	const Invisibility = defineBooleanProperty({
		id: PropertyId.Invisibility,
		name: "Invisibility",
		defaultValue: false,
	});

	it("resolves zero modifiers", () => {
		expect(Invisibility.resolve(false, [])).toBe(false);
		expect(Invisibility.resolve(true, [])).toBe(true);
	});

	it("resolves enable modifier", () => {
		const modifierRegistry = new ModifierRegistry();
		Invisibility.enable().applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
	});

	it("resolves disable modifier", () => {
		const modifierRegistry = new ModifierRegistry();
		Invisibility.disable().applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(false);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(false);
	});

	it("resolves toggle false modifier", () => {
		const modifierRegistry = new ModifierRegistry();
		Invisibility.toggle(false).applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(false);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(false);
	});

	it("resolves toggle true modifier", () => {
		const modifierRegistry = new ModifierRegistry();
		Invisibility.toggle(true).applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);
	});

	it("resolves multiple order-dependent modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		Invisibility.toggle(true).applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);

		Invisibility.enable().applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);

		Invisibility.disable().applyTo(modifierRegistry, 0);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(false);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(false);
	});

	it("resolves multiple priority-dependent modifiers", () => {
		const modifierRegistry = new ModifierRegistry();
		Invisibility.toggle(true).applyTo(modifierRegistry, 300);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);

		Invisibility.enable().applyTo(modifierRegistry, 200);
		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);

		Invisibility.disable().applyTo(modifierRegistry, 100);

		expect(Invisibility.resolve(false, modifierRegistry.get(Invisibility))).toBe(true);
		expect(Invisibility.resolve(true, modifierRegistry.get(Invisibility))).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import { defineBooleanProperty, ModifierRegistry } from "../src";

const Invisibility = defineBooleanProperty({
	name: "Invisibility",
	defaultValue: false,
});

function resolve(registry: ModifierRegistry, base: boolean) {
	return Invisibility.resolve(base, registry.get(Invisibility));
}

describe("boolean property", () => {
	it.each([false, true])("returns the base value with no modifiers (%s)", (base) => {
		expect(Invisibility.resolve(base, [])).toBe(base);
	});

	it.each([
		["enable", () => Invisibility.enable(), true],
		["disable", () => Invisibility.disable(), false],
		["toggle(false)", () => Invisibility.toggle(false), false],
		["toggle(true)", () => Invisibility.toggle(true), true],
	] as const)("resolves %s", (_, createModifier, expected) => {
		const registry = new ModifierRegistry();
		createModifier().applyTo(registry, 0);

		expect(resolve(registry, false)).toBe(expected);
		expect(resolve(registry, true)).toBe(expected);
	});

	it("preserves insertion order within the same priority", () => {
		const registry = new ModifierRegistry();

		Invisibility.toggle(true).applyTo(registry, 0);
		expect(resolve(registry, false)).toBe(true);
		expect(resolve(registry, true)).toBe(true);

		Invisibility.enable().applyTo(registry, 0);
		expect(resolve(registry, false)).toBe(true);
		expect(resolve(registry, true)).toBe(true);

		Invisibility.disable().applyTo(registry, 0);
		expect(resolve(registry, false)).toBe(false);
		expect(resolve(registry, true)).toBe(false);
	});

	it("resolves modifiers by priority instead of insertion order", () => {
		const registry = new ModifierRegistry();

		Invisibility.toggle(true).applyTo(registry, 300);
		Invisibility.enable().applyTo(registry, 200);
		Invisibility.disable().applyTo(registry, 100);

		expect(resolve(registry, false)).toBe(true);
		expect(resolve(registry, true)).toBe(true);
	});
});

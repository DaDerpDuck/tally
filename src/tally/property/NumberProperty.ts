import { contributeModifier } from "../modifier/ModifierContribution.js";
import { BaseProperty, type PropertyDefinition } from "./BaseProperty.js";
import type { Property } from "./Property.js";

type NumberModifier = {
	readonly property: Property<number>;
	readonly operation: "add" | "multiply" | "override";
	readonly value: number;
};

/**
 * A numeric Property supporting additive, multiplicative, and override Modifiers.
 */
export class NumberProperty extends BaseProperty<number, NumberModifier> {
	protected override defaultResolve(base: number, modifiers: readonly NumberModifier[]): number {
		let final = base;

		for (const modifier of modifiers) {
			switch (modifier.operation) {
				case "add":
					final += modifier.value;
					break;
				case "multiply":
					final *= modifier.value;
					break;
				case "override":
					final = modifier.value;
					break;
			}
		}

		return final;
	}

	add(n: number) {
		return contributeModifier({
			property: this,
			operation: "add",
			value: n,
		});
	}

	multiply(n: number) {
		return contributeModifier({
			property: this,
			operation: "multiply",
			value: n,
		});
	}

	override(n: number) {
		return contributeModifier({
			property: this,
			operation: "override",
			value: n,
		});
	}
}

/**
 *
 * Creates a numeric Property definition.
 *
 * @see {@link NumberProperty}
 */
export function defineNumberProperty(definition: PropertyDefinition<number>) {
	return new NumberProperty(definition);
}

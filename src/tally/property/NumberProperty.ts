import type { Modifier } from "../modifier/Modifier.js";
import { contributeModifier } from "../modifier/ModifierContribution.js";
import { BaseProperty, type PropertyDefinition } from "./BaseProperty.js";

/**
 * A numeric Property supporting additive, multiplicative, and override Modifiers.
 */
export class NumberProperty extends BaseProperty<number> {
	protected override defaultResolve(
		base: number,
		modifiers: readonly Modifier<number>[]
	): number {
		let final = base;

		for (const modifier of modifiers) {
			switch (modifier.operation) {
				case "add":
					final += modifier.value as number;
					break;
				case "multiply":
					final *= modifier.value as number;
					break;
				case "override":
					final = modifier.value as number;
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

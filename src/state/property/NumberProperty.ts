import type { Modifier } from "../../index.js";
import { contributeModifier } from "../modifier/ModifierContribution.js";
import { Property, type PropertyDefinition } from "./Property.js";

export class NumberProperty extends Property<number> {
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

export function defineNumberProperty(definition: PropertyDefinition<number>) {
	return new NumberProperty(definition);
}

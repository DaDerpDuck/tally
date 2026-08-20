import type { Modifier } from "../modifier/Modifier.js";
import { contributeModifier } from "../modifier/ModifierContribution.js";
import { Property, type PropertyOptions } from "./Property.js";

export class NumberProperty extends Property<number> {
	constructor(
		options: PropertyOptions<number>,
		resolve: (base: number, modifiers: readonly Modifier<number>[]) => number
	) {
		super(options, resolve);
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

export function defineNumberProperty(
	options: PropertyOptions<number>,
	resolve?: (base: number, modifiers: readonly Modifier<number>[]) => number
) {
	resolve ??= (base, modifiers) => {
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
	};

	return new NumberProperty(options, resolve);
}

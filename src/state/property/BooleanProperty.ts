import type { Modifier } from "../modifier/Modifier.js";
import { contributeModifier } from "../modifier/ModifierContribution.js";
import { Property, type PropertyOptions } from "./Property.js";

export class BooleanProperty extends Property<boolean> {
	constructor(
		options: PropertyOptions<boolean>,
		resolve: (base: boolean, modifiers: readonly Modifier<boolean>[]) => boolean
	) {
		super(options, resolve);
	}

	enable() {
		return contributeModifier({
			property: this,
			operation: "override",
			value: true,
		});
	}

	disable() {
		return contributeModifier({
			property: this,
			operation: "override",
			value: false,
		});
	}

	toggle(enabled: boolean) {
		return contributeModifier({
			property: this,
			operation: "override",
			value: enabled,
		});
	}
}

export function defineBooleanProperty(
	options: PropertyOptions<boolean>,
	resolve?: (base: boolean, modifiers: readonly Modifier<boolean>[]) => boolean
) {
	resolve ??= (base, modifiers) => {
		let final = base;

		for (const modifier of modifiers) {
			switch (modifier.operation) {
				case "override":
					final = modifier.value as boolean;
					break;
			}
		}

		return final;
	};

	return new BooleanProperty(options, resolve);
}

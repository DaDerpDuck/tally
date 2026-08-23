import type { Modifier } from "../modifier/Modifier.js";
import { contributeModifier } from "../modifier/ModifierContribution.js";
import { BaseProperty, type PropertyDefinition } from "./BaseProperty.js";

export class BooleanProperty extends BaseProperty<boolean> {
	protected override defaultResolve(
		base: boolean,
		modifiers: readonly Modifier<boolean>[]
	): boolean {
		let final = base;

		for (const modifier of modifiers) {
			switch (modifier.operation) {
				case "override":
					final = modifier.value as boolean;
					break;
			}
		}

		return final;
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

export function defineBooleanProperty(definition: PropertyDefinition<boolean>) {
	return new BooleanProperty(definition);
}

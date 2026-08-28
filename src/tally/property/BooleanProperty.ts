import { contributeModifier } from "../modifier/ModifierContribution.js";
import { BaseProperty, type PropertyDefinition } from "./BaseProperty.js";
import type { Property } from "./Property.js";

type BooleanModifier = {
	readonly property: Property<boolean>;
	readonly operation: "override";
	readonly value: boolean;
};

/**
 * A boolean Property whose Modifiers override its current value.
 */
export class BooleanProperty extends BaseProperty<boolean, BooleanModifier> {
	protected override defaultResolve(
		base: boolean,
		modifiers: readonly BooleanModifier[]
	): boolean {
		let final = base;

		for (const modifier of modifiers) {
			switch (modifier.operation) {
				case "override":
					final = modifier.value;
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

/**
 *
 * Creates a boolean Property definition.
 *
 * @see {@link BooleanProperty}
 */
export function defineBooleanProperty(definition: PropertyDefinition<boolean>) {
	return new BooleanProperty(definition);
}

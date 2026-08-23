import { contributeModifier } from "../modifier/ModifierContribution.js";
import { Property, type PropertyDefinition } from "./Property.js";

export class BooleanProperty extends Property<boolean> {
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
	const resolve =
		definition.resolve ??
		((base, modifiers) => {
			let final = base;

			for (const modifier of modifiers) {
				switch (modifier.operation) {
					case "override":
						final = modifier.value as boolean;
						break;
				}
			}

			return final;
		});

	const equals = definition.equals ?? ((a, b) => a === b);

	return new BooleanProperty(definition, resolve, equals);
}

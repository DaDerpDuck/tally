import type { Modifier } from "../modifier/Modifier.js";
import { contributeModifier } from "../modifier/ModifierContribution.js";
import { registerProperty, type Registrable, type Registry } from "../state/Registrable.js";
import type { Property } from "./Property.js";
import {
	resolvePropertyDefinition,
	type PropertyDefinition,
	type ResolvedPropertyDefinition,
} from "./PropertyDefinition.js";

export interface BooleanModifier extends Modifier<boolean> {
	readonly operation: "override";
	readonly value: boolean;
}

/**
 * A boolean Property whose Modifiers override its current value.
 */
export class BooleanProperty implements Property<boolean, BooleanModifier>, Registrable {
	readonly name: string;
	readonly defaultValue: boolean;

	constructor(private readonly definition: ResolvedPropertyDefinition<boolean, BooleanModifier>) {
		this.name = definition.name;
		this.defaultValue = definition.defaultValue;
	}

	valueEquals(a: boolean, b: boolean): boolean {
		return this.definition.valueEquals(a, b);
	}

	resolve(base: boolean, modifiers: readonly BooleanModifier[]): boolean {
		return this.definition.resolve(base, modifiers);
	}

	register(registry: Registry): void {
		return registerProperty(registry, this);
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

function defaultBooleanResolve(base: boolean, modifiers: readonly BooleanModifier[]): boolean {
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

/**
 *
 * Creates a boolean Property definition.
 *
 * @see {@link BooleanProperty}
 */
export function defineBooleanProperty(definition: PropertyDefinition<boolean>) {
	return new BooleanProperty(
		resolvePropertyDefinition(definition, {
			resolve: defaultBooleanResolve,
			valueEquals: Object.is,
		})
	);
}

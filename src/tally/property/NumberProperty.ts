import { contributeModifier } from "../modifier/ModifierContribution.js";
import {
	resolvePropertyDefinition,
	type PropertyDefinition,
	type ResolvedPropertyDefinition,
} from "./PropertyDefinition.js";
import type { Property } from "./Property.js";
import { registerProperty, type Registrable, type Registry } from "../state/Registrable.js";
import type { Modifier } from "../modifier/Modifier.js";

export interface NumberModifier extends Modifier<number> {
	readonly operation: "add" | "multiply" | "override";
	readonly value: number;
}

/**
 * A numeric Property supporting additive, multiplicative, and override Modifiers.
 */
export class NumberProperty implements Property<number, NumberModifier>, Registrable {
	readonly name: string;
	readonly defaultValue: number;

	constructor(private readonly definition: ResolvedPropertyDefinition<number, NumberModifier>) {
		this.name = definition.name;
		this.defaultValue = definition.defaultValue;
	}

	valueEquals(a: number, b: number): boolean {
		return this.definition.valueEquals(a, b);
	}

	resolve(base: number, modifiers: readonly NumberModifier[]): number {
		return this.definition.resolve(base, modifiers);
	}

	register(registry: Registry): void {
		return registerProperty(registry, this);
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

function defaultNumberResolve(base: number, modifiers: readonly NumberModifier[]): number {
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

/**
 *
 * Creates a numeric Property definition.
 *
 * @see {@link NumberProperty}
 */
export function defineNumberProperty(definition: PropertyDefinition<number, NumberModifier>) {
	return new NumberProperty(
		resolvePropertyDefinition(definition, {
			resolve: defaultNumberResolve,
			valueEquals: Object.is,
		})
	);
}

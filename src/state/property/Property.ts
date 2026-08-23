import type { Registrable, TallyContext } from "../core/TallyContext.js";
import type { Modifier } from "../modifier/Modifier.js";

export interface PropertyDefinition<T> {
	readonly name: string;
	readonly defaultValue: T;
	equals?(a: T, b: T): boolean;
	resolve?: (base: T, modifiers: readonly Modifier<T>[]) => T;
}

export class Property<T> implements Registrable {
	public readonly name: string;
	public readonly defaultValue: T;

	constructor(
		definition: PropertyDefinition<T>,
		private readonly resolveCallback: (base: T, modifiers: readonly Modifier<T>[]) => T,
		private readonly equalsCallback: (a: T, b: T) => boolean
	) {
		this.name = definition.name;
		this.defaultValue = definition.defaultValue;
	}

	resolve(base: T, modifiers: readonly Modifier<T>[]): T {
		return this.resolveCallback(base, modifiers);
	}

	equals(a: T, b: T): boolean {
		return this.equalsCallback(a, b);
	}

	register(tally: TallyContext<unknown>): void {
		if (tally.properties.has(this.name) && tally.properties.get(this.name) !== this)
			throw "Duplicate property name";
		tally.properties.set(this.name, this as Property<unknown>);
	}
}

export function defineProperty<T>(options: PropertyDefinition<T>) {
	return new Property(
		options,
		options.resolve ?? ((base) => base),
		options.equals ?? ((a, b) => a === b)
	);
}

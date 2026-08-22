import type { Registrable, TallyContext } from "../core/TallyContext.js";
import type { Modifier } from "../modifier/Modifier.js";

export class Property<T> implements Registrable {
	constructor(
		public readonly options: PropertyOptions<T>,
		public readonly resolve: (base: T, modifiers: readonly Modifier<T>[]) => T,
		public readonly equals: (a: T, b: T) => boolean
	) {}

	register(tally: TallyContext<unknown>): void {
		if (
			tally.properties.has(this.options.name) &&
			tally.properties.get(this.options.name) !== this
		)
			throw "Duplicate property name";
		tally.properties.set(this.options.name, this as Property<unknown>);
	}
}

export function defineProperty<T>(options: PropertyOptions<T>) {
	return new Property(
		options,
		options.resolve ?? ((base) => base),
		options.equals ?? ((a, b) => a === b)
	);
}

export interface PropertyOptions<T> {
	readonly name: string;
	readonly defaultValue: T;
	equals?(a: T, b: T): boolean;
	resolve?: (base: T, modifiers: readonly Modifier<T>[]) => T;
}

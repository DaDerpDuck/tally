import type { Registrable, Tally } from "../core/Tally.js";
import type { Modifier } from "../modifier/Modifier.js";

export class Property<T> implements Registrable {
	constructor(
		public readonly options: PropertyOptions<T>,
		public readonly resolve: (base: T, modifiers: readonly Modifier<T>[]) => T
	) {}

	register(tally: Tally<unknown>): void {
		tally.properties.set(this.options.name, this as Property<unknown>);
	}
}

export function defineProperty<T>(
	options: PropertyOptions<T>,
	resolve?: (base: T, modifiers: readonly Modifier<T>[]) => T
) {
	resolve ??= (base: T) => base;
	return new Property(options, resolve);
}

export interface PropertyOptions<T> {
	readonly name: string;
	readonly defaultValue: T;
}

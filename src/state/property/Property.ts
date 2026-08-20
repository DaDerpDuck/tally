import type { Modifier } from "../modifier/Modifier.js";

export class Property<T> {
	constructor(
		public readonly options: PropertyOptions<T>,
		public readonly resolve: (base: T, modifiers: readonly Modifier<T>[]) => T
	) {}
}

export function defineProperty<T>(
	options: PropertyOptions<T>,
	resolve?: (base: T, modifiers: readonly Modifier<T>[]) => T
) {
	resolve ??= (base: T) => base;
	return new Property(options, resolve);
}

export interface PropertyOptions<T> {
	id: number;
	name: string;
	defaultValue: T;
}

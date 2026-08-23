import type { Property } from "../property/Property.js";
import type { AnySourceType } from "../source/SourceType.js";

export interface Registry {
	readonly sources: Map<string, AnySourceType>;
	readonly properties: Map<string, Property<unknown>>;
}

export interface Registrable {
	register(registry: Registry): void;
}

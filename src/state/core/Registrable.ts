import type { AnyProperty } from "../property/Property.js";
import type { AnySourceType } from "../source/SourceType.js";

export interface Registry {
	readonly sources: Map<string, AnySourceType>;
	readonly properties: Map<string, AnyProperty>;
}

export interface Registrable {
	register(registry: Registry): void;
}

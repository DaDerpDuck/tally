import type { AnyDescriptorType } from "../state/descriptor/DescriptorType.js";
import type { AnyProperty } from "../property/Property.js";
import type { AnySourceType } from "../state/source/SourceType.js";

export interface Registry {
	readonly sources: Map<string, AnySourceType>;
	readonly properties: Map<string, AnyProperty>;
	readonly descriptors: Map<string, AnyDescriptorType>;
}

export interface Registrable {
	register(registry: Registry): void;
}

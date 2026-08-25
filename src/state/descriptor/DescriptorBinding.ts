import type { Source } from "../source/Source.js";
import type {
	DescriptorType,
	ExtractDataFromDescriptor,
	ExtractSourceFromDescriptor,
} from "./DescriptorType.js";

export interface AnyDescriptorBinding {
	readonly source: Source | undefined;
	update(data: unknown): void;
	destroy(): void;
}

export interface DescriptorBinding<
	TDescriptorType extends DescriptorType<unknown, unknown>,
> extends AnyDescriptorBinding {
	readonly source: ExtractSourceFromDescriptor<TDescriptorType> | undefined;
	update(data: ExtractDataFromDescriptor<TDescriptorType>): void;
	destroy(): void;
}

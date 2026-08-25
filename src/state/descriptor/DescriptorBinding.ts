import type { Source } from "../source/Source.js";

export interface AnyDescriptorBinding {
	readonly source: Source;
	update(data: unknown): void;
	destroy(): void;
}

export interface DescriptorBinding<TDescriptorData, TSourceData> extends AnyDescriptorBinding {
	readonly source: Source<TSourceData>;
	update(data: TDescriptorData): void;
	destroy(): void;
}

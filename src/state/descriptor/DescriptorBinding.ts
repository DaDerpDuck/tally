import type { Source } from "../source/Source.js";

export interface AnyDescriptorBinding {
	readonly source: Source | undefined;
	update(data: unknown): void;
	destroy(): void;
}

export interface DescriptorBinding<TDescriptorData, TSourceData> extends AnyDescriptorBinding {
	readonly source: Source<TSourceData> | undefined;
	update(data: TDescriptorData): void;
	destroy(): void;
}

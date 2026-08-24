import type { Source } from "../source/Source.js";
import type { DescriptorType, ExtractDataFromDescriptor } from "./DescriptorType.js";

type Disconnect = () => void;

export interface AnyDescriptor {
	readonly id: number;
	readonly type: DescriptorType<unknown, Source>;

    set(data: unknown): void;
    get(): unknown;
	onUpdate(callback: (self: this) => void): Disconnect;
	onDestroy(callback: (self: this) => void): Disconnect;
	destroy(): void;
}

export interface Descriptor<
	TDescriptorType extends DescriptorType<unknown, Source>,
> extends AnyDescriptor {
	readonly id: number;
	readonly type: TDescriptorType;

	set(data: ExtractDataFromDescriptor<TDescriptorType>): void;
	get(): ExtractDataFromDescriptor<TDescriptorType>;
	onUpdate(callback: (self: this) => void): Disconnect;
	onDestroy(callback: (self: this) => void): Disconnect;
	destroy(): void;
}

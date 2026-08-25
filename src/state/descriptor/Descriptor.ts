import type { Source } from "../source/Source.js";
import type { DescriptorType } from "./DescriptorType.js";

type Disconnect = () => void;

export interface AnyDescriptor {
	readonly id: number;
	readonly type: DescriptorType<unknown, unknown>;

	getSource(): Source;
	set(data: unknown): void;
	get(): unknown;
	onUpdate(callback: (self: this) => void): Disconnect;
	onDestroy(callback: (self: this) => void): Disconnect;
	destroy(): void;
}

export interface Descriptor<TDescriptorData, TSourceData> extends AnyDescriptor {
	readonly id: number;
	readonly type: DescriptorType<TDescriptorData, TSourceData>;

	getSource(): Source<TSourceData>;
	set(data: TDescriptorData): void;
	get(): TDescriptorData;
	onUpdate(callback: (self: this) => void): Disconnect;
	onDestroy(callback: (self: this) => void): Disconnect;
	destroy(): void;
}

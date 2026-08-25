import type { Disconnect } from "../../util/Disconnect.js";
import type { StateProvenance } from "../Provenance.js";
import type { Source } from "../source/Source.js";
import type { DescriptorType } from "./DescriptorType.js";

export interface AnyDescriptor {
	readonly id: number;
	readonly type: DescriptorType<unknown, unknown>;
	readonly provenance: StateProvenance;

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
	readonly provenance: StateProvenance;

	getSource(): Source<TSourceData>;
	set(data: TDescriptorData): void;
	get(): TDescriptorData;
	onUpdate(callback: (self: this) => void): Disconnect;
	onDestroy(callback: (self: this) => void): Disconnect;
	destroy(): void;
}

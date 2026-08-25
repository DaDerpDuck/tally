import type { Disconnect } from "../../util/Disconnect.js";
import type { StateProvenance } from "../Provenance.js";
import type { SourceType } from "./SourceType.js";

export interface Source<TData = unknown> {
	readonly id: number;
	readonly type: SourceType<TData>;
	readonly priority: number;
	readonly provenance: StateProvenance;

	set(data: TData): void;
	get(): TData;
	onUpdate(callback: (self: this) => void): Disconnect;
	onDestroy(callback: (self: this) => void): Disconnect;
	destroy(): void;
}

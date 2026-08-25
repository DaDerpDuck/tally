import type { Disconnect } from "../../util/Disconnect.js";
import type { Source } from "./Source.js";
import type { SourceProvenance } from "./SourceOption.js";
import type { SourceType } from "./SourceType.js";

export class SourceInstance<TData> implements Source<TData> {
	private readonly updateCallbacks = new Set<(self: this) => void>();
	private readonly destroyCallbacks = new Set<(self: this) => void>();

	constructor(
		public readonly id: number,
		public readonly type: SourceType<TData>,
		public readonly priority: number,
		public readonly provenance: SourceProvenance,
		private data: TData
	) {}

	set(data: TData) {
		this.data = data;
		for (const callback of this.updateCallbacks) {
			callback(this);
		}
	}

	get(): TData {
		return this.data;
	}

	onUpdate(callback: (self: this) => void): Disconnect {
		this.updateCallbacks.add(callback);
		return () => {
			this.updateCallbacks.delete(callback);
		};
	}

	onDestroy(callback: (self: this) => void): Disconnect {
		this.destroyCallbacks.add(callback);
		return () => {
			this.destroyCallbacks.delete(callback);
		};
	}

	destroy(): void {
		this.destroyCallbacks.forEach((callback) => callback(this));
		this.updateCallbacks.clear();
		this.destroyCallbacks.clear();
	}
}

import type { Source } from "./Source.js";
import type { SourceType } from "./SourceType.js";

type Disconnect = () => void;

export class StaticSource<TData> implements Source<TData> {
	private readonly updateCallbacks = new Set<(self: this) => void>();
	private readonly destroyCallbacks = new Set<(self: this) => void>();

	constructor(
		public readonly id: number,
		public readonly type: SourceType<TData>,
		public readonly priority: number,
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
		for (const callback of this.destroyCallbacks) {
			callback(this);
		}
		this.updateCallbacks.clear();
		this.destroyCallbacks.clear();
	}
}

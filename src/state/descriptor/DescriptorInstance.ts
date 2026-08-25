import type { Descriptor } from "./Descriptor.js";
import type { DescriptorBinding } from "./DescriptorBinding.js";
import type {
	DescriptorType,
	ExtractDataFromDescriptor,
	ExtractSourceFromDescriptor,
} from "./DescriptorType.js";
import type { DescriptorId } from "./ReplicatedDescriptor.js";

type Disconnect = () => void;

export class DescriptorInstance<
	TDescriptorType extends DescriptorType<unknown, unknown>,
> implements Descriptor<TDescriptorType> {
	private readonly updateCallbacks = new Set<(self: this) => void>();
	private readonly destroyCallbacks = new Set<(self: this) => void>();

	constructor(
		public readonly id: DescriptorId,
		public readonly type: TDescriptorType,
		private readonly binding: DescriptorBinding<TDescriptorType>,
		private data: ExtractDataFromDescriptor<TDescriptorType>
	) {
		if (!this.binding.source) throw new Error("Binding has no source");
		this.binding.update(data);
	}

	set(data: ExtractDataFromDescriptor<TDescriptorType>) {
		this.data = data;
		this.binding.update(data);
		for (const callback of this.updateCallbacks) {
			callback(this);
		}
	}

	get(): ExtractDataFromDescriptor<TDescriptorType> {
		return this.data;
	}

	getSource(): ExtractSourceFromDescriptor<TDescriptorType> {
		return this.binding.source!;
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

	destroy() {
		this.binding.destroy();
		this.destroyCallbacks.forEach((callback) => callback(this));
	}
}

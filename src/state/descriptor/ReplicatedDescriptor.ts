import type { ReplicationValue } from "../replication/ReplicationValue.js";
import type { AnyDescriptor } from "./Descriptor.js";

export type DescriptorId = number;

export interface ReplicatedDescriptor {
	readonly id: DescriptorId;
	readonly type: string;
	readonly data: ReplicationValue;
}

export function serializeDescriptor(descriptor: AnyDescriptor): ReplicatedDescriptor {
	return {
		id: descriptor.id,
		type: descriptor.type.name,
		data: descriptor.type.replication.serialize(descriptor.get()),
	};
}

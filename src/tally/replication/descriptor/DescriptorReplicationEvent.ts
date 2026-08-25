import type { ReplicationValue } from "../ReplicationValue.js";
import type { ReplicatedDescriptor, DescriptorId } from "./ReplicatedDescriptor.js";

export type DescriptorReplicationEvent =
	| { readonly kind: "added"; readonly descriptor: ReplicatedDescriptor }
	| { readonly kind: "updated"; readonly id: DescriptorId; readonly data: ReplicationValue }
	| { readonly kind: "removed"; readonly id: DescriptorId };

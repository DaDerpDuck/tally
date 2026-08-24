import type { ReplicationValue } from "./ReplicationValue.js";

export interface AnyReplicationDefinition {
	deserialize(serialized: ReplicationValue): unknown;
}

export interface ReplicationDefinition<TData> extends AnyReplicationDefinition {
	serialize(data: TData): ReplicationValue;
	deserialize(serialized: ReplicationValue): TData;
}

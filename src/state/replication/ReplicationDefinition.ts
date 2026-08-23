import type { ReplicationValue } from "./ReplicationValue.js";

export interface ReplicationDefinition<TData> {
	serialize(data: TData): ReplicationValue;
	deserialize(serialized: ReplicationValue): TData;
}

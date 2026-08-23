import type { Source } from "../source/Source.js";
import type { ReplicationValue } from "./ReplicationValue.js";

export type SourceId = number;

export interface ReplicatedSource {
	readonly id: SourceId;
	readonly type: string;
	readonly priority: number;
	readonly data: ReplicationValue;
}

export function serializeSource(source: Source<unknown>): ReplicatedSource {
	if (!source.type.replication)
		throw new Error("Cannot serialize a source without a ReplicationDefinition");
	return {
		id: source.id,
		type: source.type.name,
		priority: source.priority,
		data: source.type.replication!.serialize(source.get()),
	};
}

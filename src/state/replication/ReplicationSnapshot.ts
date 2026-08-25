import type { AgentState } from "../core/AgentState.js";
import {
	serializeDescriptor,
	type ReplicatedDescriptor,
} from "../descriptor/ReplicatedDescriptor.js";
import { serializeSource, type ReplicatedSource } from "./ReplicatedSource.js";

export interface ReplicationSnapshot {
	readonly sources: readonly ReplicatedSource[];
	readonly descriptors: readonly ReplicatedDescriptor[];
}

export function createReplicationSnapshot(agent: AgentState<unknown>): ReplicationSnapshot {
	return {
		sources: agent
			.getSources()
			.values()
			.filter(
				(source) =>
					source.type.replication !== undefined && source.provenance.domain === "local"
			)
			.map((source) => serializeSource(source))
			.toArray(),
		descriptors: agent
			.getDescriptors()
			.values()
			.map((descriptor) => serializeDescriptor(descriptor))
			.toArray(),
	};
}

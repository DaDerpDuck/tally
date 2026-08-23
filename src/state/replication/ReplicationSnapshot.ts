import type { AgentState } from "../core/AgentState.js";
import { serializeSource, type ReplicatedSource } from "./ReplicatedSource.js";

export interface ReplicationSnapshot {
	readonly sources: readonly ReplicatedSource[];
}

export function createReplicationSnapshot(agent: AgentState<unknown>): ReplicationSnapshot {
	return {
		sources: agent
			.getSources()
			.values()
			.map((source) => serializeSource(source))
			.toArray(),
	};
}

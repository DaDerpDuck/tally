import type { AgentState } from "../core/AgentState.js";
import type { Source } from "../source/Source.js";
import type { AnySourceType, SourceType } from "../source/SourceType.js";
import type { ReplicatedSource, ReplicationValue, SourceId } from "./index.js";
import type { ReplicationSnapshot } from "./ReplicationSnapshot.js";
import type { SourceReplicationEvent } from "./SourceReplicationEvent.js";

export class ReplicationReceiver {
	private readonly replicatedSources = new Map<number, Source<unknown>>();

	constructor(
		private readonly agent: AgentState<unknown>,
		private readonly resolveType: (name: string) => AnySourceType | undefined
	) {}

	apply(events: readonly SourceReplicationEvent[]) {
		this.agent.transact(() => {
			for (const event of events) {
				if (event.kind === "added") {
					this.addSource(event.source);
				} else if (event.kind === "updated") {
					this.updateSource(event.id, event.data);
				} else if (event.kind === "removed") {
					this.removeSource(event.id);
				}
			}
		});
	}

	applySnapshot(snapshot: ReplicationSnapshot) {
		this.agent.transact(() => {
			for (const replicatedSource of snapshot.sources) {
				if (this.replicatedSources.has(replicatedSource.id))
					this.updateSource(replicatedSource.id, replicatedSource.data);
				else this.addSource(replicatedSource);
			}
		});
	}

	private addSource(replicatedSource: ReplicatedSource): Source<unknown> | undefined {
		if (this.replicatedSources.has(replicatedSource.id))
			throw new Error("Attempted to add an existing replicated source");
		const sourceType = this.resolveType(replicatedSource.type);
		if (!sourceType) return undefined;
		if (!sourceType.replication) return undefined;

		const source = this.agent.addSource(
			sourceType as SourceType<unknown>,
			replicatedSource.priority,
			sourceType.replication.deserialize(replicatedSource.data)
		);
		if (!source) return undefined;

		this.replicatedSources.set(replicatedSource.id, source);
		source.onDestroy(() => {
			if (this.replicatedSources.get(replicatedSource.id) === source)
				this.replicatedSources.delete(replicatedSource.id);
		});
		return source;
	}

	private updateSource(sourceId: SourceId, data: ReplicationValue) {
		const source = this.replicatedSources.get(sourceId);
		if (!source) return;
		source.set(source.type.replication!.deserialize(data));
	}

	private removeSource(sourceId: SourceId) {
		this.replicatedSources.get(sourceId)?.destroy();
		this.replicatedSources.delete(sourceId);
	}
}

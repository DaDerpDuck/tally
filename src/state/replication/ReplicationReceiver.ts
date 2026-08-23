import type { AgentState } from "../core/AgentState.js";
import type { Source } from "../source/Source.js";
import type { AnySourceType, SourceType } from "../source/SourceType.js";
import type { ReplicatedSource } from "./index.js";
import type { ReplicationSnapshot } from "./ReplicationSnapshot.js";
import type { SourceReplicationEvent } from "./SourceReplicationEvent.js";

export class ReplicationReceiver {
	private readonly replicatedSources = new Map<number, Source<unknown>>();

	constructor(
		private readonly agent: AgentState<unknown>,
		private readonly resolveType: (name: string) => AnySourceType | undefined
	) {}

	apply(events: readonly SourceReplicationEvent[]) {
		this.agent.transaction(() => {
			for (const event of events) {
				if (event.kind === "added") {
					this.addSource(event.source);
				} else if (event.kind === "updated") {
					const source = this.replicatedSources.get(event.id);
					if (!source) continue;
					source.set(source.type.replication!.deserialize(event.data));
				} else if (event.kind === "removed") {
					this.replicatedSources.get(event.id)?.destroy();
					this.replicatedSources.delete(event.id);
				}
			}
		});
	}

	applySnapshot(snapshot: ReplicationSnapshot) {
		this.agent.transaction(() => {
			for (const replicatedSource of snapshot.sources) {
				this.addSource(replicatedSource);
			}
		});
	}

	private addSource(replicatedSource: ReplicatedSource): Source<unknown> | undefined {
		const sourceType = this.resolveType(replicatedSource.type) as SourceType<object>;
		if (!sourceType) return undefined;

		const source = this.agent.addSource(
			sourceType,
			replicatedSource.priority,
			sourceType.replication!.deserialize(replicatedSource.data)
		);
		if (!source) return undefined;

		this.replicatedSources.set(replicatedSource.id, source);

		source.onDestroy(() => this.replicatedSources.delete(replicatedSource.id));

		return source;
	}
}

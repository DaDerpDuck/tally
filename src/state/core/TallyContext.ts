import type { Property } from "../property/Property.js";
import type { Source } from "../source/Source.js";
import type { SourceType } from "../source/SourceType.js";
import { AgentState } from "./AgentState.js";

type SourceCallback<TEntity> = (agent: AgentState<TEntity>, source: Source<unknown>) => void;
type Disconnect = () => void;

export interface Registrable {
	register(tally: TallyContext<unknown>): void;
}

export class TallyContext<TEntity> {
	public readonly sources = new Map<string, SourceType<unknown>>();
	public readonly properties = new Map<string, Property<unknown>>();

	private readonly sourceAddedCallbacks = new Set<SourceCallback<TEntity>>();
	private readonly sourceRemovedCallbacks = new Set<SourceCallback<TEntity>>();
	private readonly sourceUpdatedCallbacks = new Set<SourceCallback<TEntity>>();
	private readonly agentConnections = new Set<Disconnect>();

	createAgentState(entity: TEntity) {
		const agent = new AgentState(entity);
		this.agentConnections.add(
			agent.onSourceAdded((source) =>
				this.sourceAddedCallbacks.forEach((callback) => callback(agent, source))
			)
		);
		this.agentConnections.add(
			agent.onSourceRemoved((source) =>
				this.sourceRemovedCallbacks.forEach((callback) => callback(agent, source))
			)
		);
		this.agentConnections.add(
			agent.onSourceUpdated((source) =>
				this.sourceUpdatedCallbacks.forEach((callback) => callback(agent, source))
			)
		);
		return agent;
	}

	register<T extends Registrable>(definition: T): T {
		definition.register(this as TallyContext<unknown>);
		return definition;
	}

	onSourceAdded(callback: SourceCallback<TEntity>): Disconnect {
		this.sourceAddedCallbacks.add(callback);
		return () => this.sourceAddedCallbacks.delete(callback);
	}

	onSourceRemoved(callback: SourceCallback<TEntity>): Disconnect {
		this.sourceRemovedCallbacks.add(callback);
		return () => this.sourceRemovedCallbacks.delete(callback);
	}

	onSourceUpdated(callback: SourceCallback<TEntity>): Disconnect {
		this.sourceUpdatedCallbacks.add(callback);
		return () => this.sourceUpdatedCallbacks.delete(callback);
	}

	destroy() {
		this.agentConnections.forEach((disconnect) => disconnect());
		this.sourceAddedCallbacks.clear();
		this.sourceRemovedCallbacks.clear();
		this.sourceUpdatedCallbacks.clear();
	}
}

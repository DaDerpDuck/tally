import type { AnyDescriptor } from "../state/descriptor/Descriptor.js";
import type {
	AnyDescriptorHandler,
	DescriptorHandler,
} from "../state/descriptor/DescriptorHandler.js";
import type { AnyDescriptorType, DescriptorType } from "../state/descriptor/DescriptorType.js";
import type { AnyProperty } from "../property/Property.js";
import type { ReplicationEvent } from "../replication/ReplicationEvent.js";
import type { Source } from "../state/source/Source.js";
import type { AnySourceType } from "../state/source/SourceType.js";
import { AgentState } from "./AgentState.js";
import type { Registrable, Registry } from "../state/Registrable.js";
import { serializeSource } from "../replication/source/ReplicatedSource.js";
import { serializeDescriptor } from "../replication/index.js";
import type { Disconnect } from "../util/Disconnect.js";

type ReplicationCallback<TEntity> = (agent: AgentState<TEntity>, event: ReplicationEvent) => void;
type SourceCallback<TEntity> = (agent: AgentState<TEntity>, source: Source) => void;
type DescriptorCallback<TEntity> = (agent: AgentState<TEntity>, descriptor: AnyDescriptor) => void;

export class TallyContext<TEntity> {
	private readonly registry: Registry = {
		sources: new Map(),
		properties: new Map(),
		descriptors: new Map(),
	};
	private readonly descriptorHandlers = new Map<AnyDescriptorType, AnyDescriptorHandler>();

	private readonly sourceAddedCallbacks = new Set<SourceCallback<TEntity>>();
	private readonly sourceRemovedCallbacks = new Set<SourceCallback<TEntity>>();
	private readonly sourceUpdatedCallbacks = new Set<SourceCallback<TEntity>>();
	private readonly descriptorAddedCallbacks = new Set<DescriptorCallback<TEntity>>();
	private readonly descriptorRemovedCallbacks = new Set<DescriptorCallback<TEntity>>();
	private readonly descriptorUpdatedCallbacks = new Set<DescriptorCallback<TEntity>>();
	private readonly replicationCallbacks = new Set<ReplicationCallback<TEntity>>();
	private readonly agentConnections = new Set<Disconnect>();

	get sources(): ReadonlyMap<string, AnySourceType> {
		return this.registry.sources;
	}

	get properties(): ReadonlyMap<string, AnyProperty> {
		return this.registry.properties;
	}

	get descriptors(): ReadonlyMap<string, AnyDescriptorType> {
		return this.registry.descriptors;
	}

	createAgentState(entity: TEntity) {
		const agent = new AgentState(entity);
		this.descriptorHandlers.forEach((handler, type) =>
			agent.registerDescriptorHandler(type as DescriptorType<unknown, unknown>, handler)
		);
		this.agentConnections.add(
			agent.onSourceAdded((source) => {
				this.sourceAddedCallbacks.forEach((callback) => callback(agent, source));
				if (source.type.replication && source.provenance.domain === "local")
					this.replicationCallbacks.forEach((callback) =>
						callback(agent, {
							target: "source",
							event: {
								kind: "added",
								source: serializeSource(source),
							},
						})
					);
			})
		);
		this.agentConnections.add(
			agent.onSourceRemoved((source) => {
				this.sourceRemovedCallbacks.forEach((callback) => callback(agent, source));
				if (source.type.replication && source.provenance.domain === "local")
					this.replicationCallbacks.forEach((callback) =>
						callback(agent, {
							target: "source",
							event: {
								kind: "removed",
								id: source.id,
							},
						})
					);
			})
		);
		this.agentConnections.add(
			agent.onSourceUpdated((source) => {
				this.sourceUpdatedCallbacks.forEach((callback) => callback(agent, source));
				if (source.type.replication && source.provenance.domain === "local")
					this.replicationCallbacks.forEach((callback) =>
						callback(agent, {
							target: "source",
							event: {
								kind: "updated",
								id: source.id,
								data: source.type.replication!.serialize(source.get()),
							},
						})
					);
			})
		);
		this.agentConnections.add(
			agent.onDescriptorAdded((descriptor) => {
				this.descriptorAddedCallbacks.forEach((callback) => callback(agent, descriptor));
				this.replicationCallbacks.forEach((callback) =>
					callback(agent, {
						target: "descriptor",
						event: { kind: "added", descriptor: serializeDescriptor(descriptor) },
					})
				);
			})
		);
		this.agentConnections.add(
			agent.onDescriptorRemoved((descriptor) => {
				this.descriptorRemovedCallbacks.forEach((callback) => callback(agent, descriptor));
				this.replicationCallbacks.forEach((callback) =>
					callback(agent, {
						target: "descriptor",
						event: { kind: "removed", id: descriptor.id },
					})
				);
			})
		);
		this.agentConnections.add(
			agent.onDescriptorUpdated((descriptor) => {
				this.descriptorUpdatedCallbacks.forEach((callback) => callback(agent, descriptor));
				this.replicationCallbacks.forEach((callback) =>
					callback(agent, {
						target: "descriptor",
						event: {
							kind: "updated",
							id: descriptor.id,
							data: descriptor.type.replication.serialize(descriptor.get()),
						},
					})
				);
			})
		);
		return agent;
	}

	register<T extends Registrable>(definition: T): T {
		definition.register(this.registry);
		return definition;
	}

	registerDescriptorHandler<TDescriptorData, TSourceData>(
		type: DescriptorType<TDescriptorData, TSourceData>,
		handler: DescriptorHandler<TEntity, TDescriptorData, TSourceData>
	) {
		this.descriptorHandlers.set(type, handler as AnyDescriptorHandler);
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

	onDescriptorAdded(callback: DescriptorCallback<TEntity>): Disconnect {
		this.descriptorAddedCallbacks.add(callback);
		return () => this.descriptorAddedCallbacks.delete(callback);
	}

	onDescriptorRemoved(callback: DescriptorCallback<TEntity>): Disconnect {
		this.descriptorRemovedCallbacks.add(callback);
		return () => this.descriptorRemovedCallbacks.delete(callback);
	}

	onDescriptorUpdated(callback: DescriptorCallback<TEntity>): Disconnect {
		this.descriptorUpdatedCallbacks.add(callback);
		return () => this.descriptorUpdatedCallbacks.delete(callback);
	}

	onReplicationEmit(callback: ReplicationCallback<TEntity>): Disconnect {
		this.replicationCallbacks.add(callback);
		return () => this.replicationCallbacks.delete(callback);
	}

	destroy() {
		this.agentConnections.forEach((disconnect) => disconnect());
		this.sourceAddedCallbacks.clear();
		this.sourceRemovedCallbacks.clear();
		this.sourceUpdatedCallbacks.clear();
		this.replicationCallbacks.clear();
	}
}

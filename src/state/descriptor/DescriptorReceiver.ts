import type { AgentState } from "../core/AgentState.js";
import type { ReplicationSnapshot } from "../replication/ReplicationSnapshot.js";
import type { ReplicationValue } from "../replication/ReplicationValue.js";
import type { Source } from "../source/Source.js";
import type { AnyDescriptor } from "./Descriptor.js";
import type { DescriptorReplicationEvent } from "./DescriptorReplicationEvent.js";
import type { AnyDescriptorType, DescriptorType } from "./DescriptorType.js";
import type { DescriptorId, ReplicatedDescriptor } from "./ReplicatedDescriptor.js";

export class DescriptorReceiver {
	private readonly replicatedDescriptors = new Map<number, AnyDescriptor>();

	constructor(
		private readonly agent: AgentState<unknown>,
		private readonly resolveType: (name: string) => AnyDescriptorType | undefined
	) {}

	apply(events: readonly DescriptorReplicationEvent[]) {
		const errors: { event: DescriptorReplicationEvent; error: Error }[] = [];

		this.agent.batch(() => {
			for (const event of events) {
				try {
					if (event.kind === "added") this.addDescriptor(event.descriptor);
					else if (event.kind === "updated") this.updateDescriptor(event.id, event.data);
					else if (event.kind === "removed") this.removeDescriptor(event.id);
				} catch (err) {
					errors.push({
						event,
						error: err instanceof Error ? err : new Error(String(err)),
					});
				}
			}
		});

		if (errors.length > 0)
			throw new AggregateError(
				errors.map((e) => e.error),
				`Failed to apply ${errors.length} replication event(s)`
			);
	}

	applySnapshot(snapshot: ReplicationSnapshot) {
		const errors: { descriptor: ReplicatedDescriptor; error: Error }[] = [];

		this.agent.batch(() => {
			const markForRemoval = new Set(this.replicatedDescriptors.keys());
			for (const replicatedDescriptor of snapshot.descriptors) {
				try {
					markForRemoval.delete(replicatedDescriptor.id);
					if (this.replicatedDescriptors.has(replicatedDescriptor.id))
						this.updateDescriptor(replicatedDescriptor.id, replicatedDescriptor.data);
					else this.addDescriptor(replicatedDescriptor);
				} catch (err) {
					errors.push({
						descriptor: replicatedDescriptor,
						error: err instanceof Error ? err : new Error(String(err)),
					});
				}
			}
			markForRemoval.forEach((id) => this.removeDescriptor(id));
		});

		if (errors.length > 0)
			throw new AggregateError(
				errors.map((e) => e.error),
				`Failed to apply ${errors.length} replication descriptors(s)`
			);
	}

	private addDescriptor(replicatedDescriptor: ReplicatedDescriptor): AnyDescriptor {
		if (this.replicatedDescriptors.has(replicatedDescriptor.id))
			throw new Error("Attempted to add an existing replicated descriptor");
		const descriptorType = this.resolveType(replicatedDescriptor.type);
		if (!descriptorType)
			throw new Error("Attempted to add a non-existant replicated descriptor");

		const descriptor = this.agent.addDescriptor(
			descriptorType as DescriptorType<unknown, Source>,
			descriptorType.replication.deserialize(replicatedDescriptor.data)
		);
		if (!descriptor)
			throw new Error(
				"Unable to add a replicated descriptor due to handler returning undefined"
			);

		this.replicatedDescriptors.set(replicatedDescriptor.id, descriptor);
		descriptor.onDestroy(() => {
			if (this.replicatedDescriptors.get(replicatedDescriptor.id) === descriptor)
				this.replicatedDescriptors.delete(replicatedDescriptor.id);
		});
		return descriptor;
	}

	private updateDescriptor(descriptorId: DescriptorId, data: ReplicationValue) {
		const descriptor = this.replicatedDescriptors.get(descriptorId);
		if (!descriptor) return;
		descriptor.set(descriptor.type.replication!.deserialize(data));
	}

	private removeDescriptor(descriptorId: DescriptorId) {
		this.replicatedDescriptors.get(descriptorId)?.destroy();
		this.replicatedDescriptors.delete(descriptorId);
	}
}

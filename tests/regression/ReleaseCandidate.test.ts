import { describe, expect, it, vi } from "vitest";
import {
	AgentState,
	createReplicationSnapshot,
	defineDescriptorType,
	defineNumberProperty,
	defineSourceType,
	DescriptorReceiver,
	SourceReceiver,
	TallyContext,
	type DescriptorHandlerContext,
	type ReplicationEvent,
} from "../src/index.js";

function bindNumberSource(ctx: DescriptorHandlerContext<undefined, number>, data: number) {
	const source = ctx.addSource(data)!;
	return {
		source,
		update(next: number) {
			source.set(next);
		},
		destroy() {
			source.destroy();
		},
	};
}

describe("state equality regressions", () => {
	it("uses Object.is as the default Source data equality", () => {
		const SourceType = defineSourceType<{ value: number }>({
			name: "DefaultSourceEquality",
			priority: 100,
			contribute: () => [],
		});
		const agent = new AgentState(undefined);
		const initial = { value: 1 };
		const source = agent.addSource(SourceType, initial)!;
		const updated = vi.fn();
		source.onUpdate(updated);

		source.set(initial);
		expect(updated).not.toHaveBeenCalled();

		source.set({ value: 1 });
		expect(updated).toHaveBeenCalledTimes(1);
	});

	it("uses custom Source data equality to suppress updates and replication", () => {
		const SourceType = defineSourceType<{ value: number; label: string }>({
			name: "CustomSourceEquality",
			priority: 100,
			contribute: () => [],
			dataEquals: (a, b) => a.value === b.value,
			replication: {
				serialize: (data) => data.value,
				deserialize: (value) => {
					if (typeof value !== "number") throw new Error("Expected number");
					return { value, label: "replicated" };
				},
			},
		});
		const tally = new TallyContext<undefined>();
		const agent = tally.createAgentState(undefined);
		const replication = vi.fn<(agent: AgentState<undefined>, event: ReplicationEvent) => void>();
		tally.onReplicationEmit(replication);
		const source = agent.addSource(SourceType, { value: 1, label: "first" })!;
		const updated = vi.fn();
		source.onUpdate(updated);
		replication.mockClear();

		source.set({ value: 1, label: "second" });
		expect(updated).not.toHaveBeenCalled();
		expect(replication).not.toHaveBeenCalled();

		source.set({ value: 2, label: "second" });
		expect(updated).toHaveBeenCalledTimes(1);
		expect(replication).toHaveBeenCalledTimes(1);
	});

	it("uses custom Descriptor data equality to suppress binding updates and replication", () => {
		const SourceType = defineSourceType<number>({
			name: "DescriptorEqualitySource",
			priority: 100,
			contribute: () => [],
		});
		const DescriptorType = defineDescriptorType<{ value: number; label: string }, number>({
			name: "DescriptorEquality",
			source: SourceType,
			dataEquals: (a, b) => a.value === b.value,
			replication: {
				serialize: (data) => data.value,
				deserialize: (value) => {
					if (typeof value !== "number") throw new Error("Expected number");
					return { value, label: "replicated" };
				},
			},
		});
		const bindingUpdated = vi.fn();
		const tally = new TallyContext<undefined>();
		tally.registerDescriptorHandler(DescriptorType, (ctx, data) => {
			const source = ctx.addSource(data.value)!;
			return {
				source,
				update(next) {
					bindingUpdated(next);
					source.set(next.value);
				},
				destroy() {
					source.destroy();
				},
			};
		});
		const agent = tally.createAgentState(undefined);
		const replication = vi.fn<(agent: AgentState<undefined>, event: ReplicationEvent) => void>();
		tally.onReplicationEmit(replication);
		const descriptor = agent.addDescriptor(DescriptorType, { value: 1, label: "first" })!;
		const updated = vi.fn();
		descriptor.onUpdate(updated);
		replication.mockClear();

		descriptor.set({ value: 1, label: "second" });
		expect(bindingUpdated).not.toHaveBeenCalled();
		expect(updated).not.toHaveBeenCalled();
		expect(replication).not.toHaveBeenCalled();

		descriptor.set({ value: 2, label: "second" });
		expect(bindingUpdated).toHaveBeenCalledTimes(1);
		expect(updated).toHaveBeenCalledTimes(1);
		expect(replication).toHaveBeenCalledTimes(1);
	});

	it("uses Property value equality only for resolved-value notifications", () => {
		const Property = defineNumberProperty({
			name: "ApproximatePropertyEquality",
			defaultValue: 0,
			valueEquals: (a, b) => Math.floor(a) === Math.floor(b),
		});
		const SourceType = defineSourceType<number>({
			name: "ApproximatePropertySource",
			priority: 100,
			contribute: (value) => [Property.override(value)],
		});
		const agent = new AgentState(undefined);
		const changed = vi.fn();
		agent.onPropertyChanged(Property, changed);
		const source = agent.addSource(SourceType, 1.1)!;
		expect(changed).toHaveBeenCalledTimes(1);

		source.set(1.2);
		expect(agent.get(Property)).toBe(1.2);
		expect(changed).toHaveBeenCalledTimes(1);

		source.set(2.1);
		expect(agent.get(Property)).toBe(2.1);
		expect(changed).toHaveBeenCalledTimes(2);
	});
});

describe("optional Descriptor replication regressions", () => {
	const Property = defineNumberProperty({
		name: "OptionalDescriptorProperty",
		defaultValue: 0,
	});
	const SourceType = defineSourceType<number>({
		name: "OptionalDescriptorSource",
		priority: 100,
		contribute: (value) => [Property.add(value)],
	});
	const LocalDescriptor = defineDescriptorType<number, number>({
		name: "LocalOnlyDescriptor",
		source: SourceType,
	});
	const ReplicatedDescriptor = defineDescriptorType<number, number>({
		name: "ReplicatedDescriptor",
		source: SourceType,
		replication: {
			serialize: (data) => data,
			deserialize: (value) => {
				if (typeof value !== "number") throw new Error("Expected number");
				return value;
			},
		},
	});

	it("does not emit replication events for a Descriptor without replication", () => {
		const tally = new TallyContext<undefined>();
		tally.registerDescriptorHandler(LocalDescriptor, bindNumberSource);
		const agent = tally.createAgentState(undefined);
		const replication = vi.fn<(agent: AgentState<undefined>, event: ReplicationEvent) => void>();
		tally.onReplicationEmit(replication);

		const descriptor = agent.addDescriptor(LocalDescriptor, 1)!;
		descriptor.set(2);
		descriptor.destroy();

		expect(replication).not.toHaveBeenCalled();
	});

	it("excludes non-replicating Descriptors from replication snapshots", () => {
		const agent = new AgentState<undefined>(undefined);
		agent.registerDescriptorHandler(LocalDescriptor, bindNumberSource);
		agent.registerDescriptorHandler(ReplicatedDescriptor, bindNumberSource);
		agent.addDescriptor(LocalDescriptor, 100);
		const replicated = agent.addDescriptor(ReplicatedDescriptor, 5)!;

		const snapshot = createReplicationSnapshot(agent);

		expect(snapshot.descriptors).toEqual([
			{ id: replicated.id, type: ReplicatedDescriptor.name, data: 5 },
		]);
	});

	it("rejects incoming replication for a Descriptor without replication metadata", () => {
		const agent = new AgentState<undefined>(undefined);
		agent.registerDescriptorHandler(LocalDescriptor, bindNumberSource);
		const receiver = new DescriptorReceiver(agent, (name) =>
			name === LocalDescriptor.name ? LocalDescriptor : undefined
		);

		expect(() =>
			receiver.apply([
				{
					target: "descriptor",
					event: {
						kind: "added",
						descriptor: { id: 10, type: LocalDescriptor.name, data: 1 },
					},
				},
			])
		).toThrow("Failed to apply 1 replication event(s)");
		expect(agent.getDescriptors(LocalDescriptor)).toHaveLength(0);
	});
});

describe("receiver validation regressions", () => {
	it("rejects an update for a Source that was never reconstructed", () => {
		const agent = new AgentState(undefined);
		const receiver = new SourceReceiver(agent, () => undefined);

		expect(() =>
			receiver.apply([
				{ target: "source", event: { kind: "updated", id: 404, data: null } },
			])
		).toThrow("Failed to apply 1 replication event(s)");
	});

	it("rejects an update for a Descriptor that was never reconstructed", () => {
		const agent = new AgentState(undefined);
		const receiver = new DescriptorReceiver(agent, () => undefined);

		expect(() =>
			receiver.apply([
				{ target: "descriptor", event: { kind: "updated", id: 404, data: null } },
			])
		).toThrow("Failed to apply 1 replication event(s)");
	});
});

describe("lifecycle regressions", () => {
	it("destroys a Descriptor binding only once", () => {
		const SourceType = defineSourceType<number>({
			name: "IdempotentDescriptorSource",
			priority: 100,
			contribute: () => [],
		});
		const DescriptorType = defineDescriptorType<number, number>({
			name: "IdempotentDescriptor",
			source: SourceType,
		});
		const bindingDestroyed = vi.fn();
		const agent = new AgentState<undefined>(undefined);
		agent.registerDescriptorHandler(DescriptorType, (ctx, data) => {
			const source = ctx.addSource(data)!;
			return {
				source,
				update(next) {
					source.set(next);
				},
				destroy() {
					bindingDestroyed();
					source.destroy();
				},
			};
		});
		const descriptor = agent.addDescriptor(DescriptorType, 1)!;

		descriptor.destroy();
		descriptor.destroy();

		expect(bindingDestroyed).toHaveBeenCalledTimes(1);
		expect(agent.getDescriptors(DescriptorType)).toHaveLength(0);
	});

	it("clears AgentState Descriptor callbacks when destroyed", () => {
		const SourceType = defineSourceType<number>({
			name: "AgentDestroyDescriptorSource",
			priority: 100,
			contribute: () => [],
		});
		const DescriptorType = defineDescriptorType<number, number>({
			name: "AgentDestroyDescriptor",
			source: SourceType,
		});
		const agent = new AgentState<undefined>(undefined);
		agent.registerDescriptorHandler(DescriptorType, bindNumberSource);
		const added = vi.fn();
		const removed = vi.fn();
		agent.onDescriptorAdded(added);
		agent.onDescriptorRemoved(removed);
		agent.addDescriptor(DescriptorType, 1);
		added.mockClear();

		agent.destroy();
		removed.mockClear();
		const descriptor = agent.addDescriptor(DescriptorType, 2)!;
		descriptor.destroy();

		expect(added).not.toHaveBeenCalled();
		expect(removed).not.toHaveBeenCalled();
	});

	it("clears TallyContext Descriptor callbacks when destroyed", () => {
		const SourceType = defineSourceType<number>({
			name: "ContextDestroyDescriptorSource",
			priority: 100,
			contribute: () => [],
		});
		const DescriptorType = defineDescriptorType<number, number>({
			name: "ContextDestroyDescriptor",
			source: SourceType,
		});
		const tally = new TallyContext<undefined>();
		tally.registerDescriptorHandler(DescriptorType, bindNumberSource);
		const agent = tally.createAgentState(undefined);
		const added = vi.fn();
		tally.onDescriptorAdded(added);

		tally.destroy();
		agent.addDescriptor(DescriptorType, 1);

		expect(added).not.toHaveBeenCalled();
	});

	it("detaches a destroyed AgentState from its TallyContext", () => {
		const SourceType = defineSourceType<number>({
			name: "DetachedAgentSource",
			priority: 100,
			contribute: () => [],
		});
		const tally = new TallyContext<undefined>();
		const agent = tally.createAgentState(undefined);
		const added = vi.fn();
		tally.onSourceAdded(added);

		agent.destroy();
		agent.addSource(SourceType, 1);

		expect(added).not.toHaveBeenCalled();
	});
});

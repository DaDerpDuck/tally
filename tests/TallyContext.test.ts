import { describe, expect, it, vi } from "vitest";
import {
	defineBooleanProperty,
	defineNumberProperty,
	defineSourceType,
	ReplicationDefinition,
	Source,
	SourceType,
	TallyContext,
} from "../src";

describe("tally", () => {
	interface PoisonData {
		intensity: number;
	}

	const PoisonSource = defineSourceType<PoisonData>({
		name: "Poison",
		duplicatePolicy: "ignore",

		create() {
			return { modifiers: [] };
		},
	});

	it("has observation on source add", () => {
		const tally = new TallyContext();
		const agent = tally.createAgentState(undefined);
		const callback = vi.fn();
		tally.onSourceAdded(callback);

		const source1 = agent.addSource(PoisonSource, 0, { intensity: 5 });
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(agent, source1);

		agent.addSource(PoisonSource, 0, { intensity: 10 });
		expect(callback).toHaveBeenCalledTimes(1);

		source1!.destroy();
		expect(callback).toHaveBeenCalledTimes(1);

		const source2 = agent.addSource(PoisonSource, 0, { intensity: 5 });
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith(agent, source2);
	});

	it("has observation on source remove", () => {
		const tally = new TallyContext();
		const agent = tally.createAgentState(undefined);
		const callback = vi.fn();
		tally.onSourceRemoved(callback);

		const source1 = agent.addSource(PoisonSource, 0, { intensity: 5 });
		expect(callback).toHaveBeenCalledTimes(0);

		agent.addSource(PoisonSource, 0, { intensity: 10 });
		expect(callback).toHaveBeenCalledTimes(0);

		source1!.destroy();
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(agent, source1);

		agent.addSource(PoisonSource, 0, { intensity: 5 });
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("has observation on source set", () => {
		const tally = new TallyContext();
		const agent = tally.createAgentState(undefined);
		const callback = vi.fn();
		tally.onSourceUpdated(callback);

		const source1 = agent.addSource(PoisonSource, 0, { intensity: 5 });
		expect(callback).toHaveBeenCalledTimes(0);

		source1!.set({ intensity: 15 });
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(agent, source1);

		agent.addSource(PoisonSource, 0, { intensity: 10 });
		expect(callback).toHaveBeenCalledTimes(1);

		source1!.destroy();
		expect(callback).toHaveBeenCalledTimes(1);

		const source2 = agent.addSource(PoisonSource, 0, { intensity: 5 });
		expect(callback).toHaveBeenCalledTimes(1);

		source2!.set({ intensity: 10 });
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith(agent, source2);
	});

	it("registers properties", () => {
		const tally = new TallyContext();
		expect(tally.properties.size).toBe(0);

		const property1 = tally.register(
			defineBooleanProperty({ name: "Boolean", defaultValue: false })
		);
		expect(tally.properties.size).toBe(1);
		expect(tally.properties.get("Boolean")).toBe(property1);

		const property2 = tally.register(defineNumberProperty({ name: "Number", defaultValue: 0 }));
		expect(tally.properties.size).toBe(2);
		expect(tally.properties.get("Number")).toBe(property2);

		expect(tally.properties.get("Nonexistent")).toBeUndefined();
	});

	it("registers sources", () => {
		const tally = new TallyContext();
		expect(tally.sources.size).toBe(0);

		const source1 = tally.register(
			defineSourceType({
				name: "Source1",
				duplicatePolicy: "allow",
				create() {
					return {
						modifiers: [],
					};
				},
			})
		);
		expect(tally.sources.size).toBe(1);
		expect(tally.sources.get("Source1")).toBe(source1);

		const source2 = tally.register(
			defineSourceType({
				name: "Source2",
				duplicatePolicy: "allow",
				create() {
					return {
						modifiers: [],
					};
				},
			})
		);
		expect(tally.sources.size).toBe(2);
		expect(tally.sources.get("Source2")).toBe(source2);

		expect(tally.sources.get("Nonexistent")).toBeUndefined();
	});

	it("registers properties idempotently", () => {
		const tally = new TallyContext();
		expect(tally.properties.size).toBe(0);

		const property = defineBooleanProperty({ name: "Boolean", defaultValue: false });
		tally.register(property);
		expect(tally.properties.size).toBe(1);
		expect(tally.properties.get("Boolean")).toBe(property);

		tally.register(property);
		expect(tally.properties.size).toBe(1);
		expect(tally.properties.get("Boolean")).toBe(property);

		const anotherProperty = defineBooleanProperty({ name: "Boolean", defaultValue: false });
		expect(() => tally.register(anotherProperty)).toThrow();
	});

	it("registers sources idempotently", () => {
		const tally = new TallyContext();
		expect(tally.sources.size).toBe(0);

		const source = defineSourceType({
			name: "Source1",
			duplicatePolicy: "allow",
			create() {
				return {
					modifiers: [],
				};
			},
		});
		tally.register(source);
		expect(tally.sources.size).toBe(1);
		expect(tally.sources.get("Source1")).toBe(source);

		tally.register(source);
		expect(tally.sources.size).toBe(1);
		expect(tally.sources.get("Source1")).toBe(source);

		const anotherSource = defineSourceType({
			name: "Source1",
			duplicatePolicy: "allow",
			create() {
				return {
					modifiers: [],
				};
			},
		});
		expect(() => tally.register(anotherSource)).toThrow();
	});
});

describe("tally static replication", () => {
	const Prop = defineNumberProperty({ name: "Property", defaultValue: 0 });

	interface PropSourceData {
		value: number;
	}

	const PropSource = defineSourceType<PropSourceData>({
		name: "PropertySource",
		duplicatePolicy: "allow",

		create(data) {
			return { modifiers: [Prop.add(data.value)] };
		},

		replication: {
			serialize(data) {
				return data.value.toString();
			},
			deserialize(serialized) {
				return { value: parseInt(serialized, 10) };
			},
		},
	});

	interface Player {
		name: string;
	}

	/*
	function serializeData(
		source: Source<unknown>,
		sourceEvent: "added" | "removed" | "updated",
		replicationOption: ReplicationDefinition<unknown>
	): string {
		return JSON.stringify({
			sourceId: source.id,
			sourcePriority: source.priority,
			sourceType: source.type.definition.name,
			sourceEvent,
			data: replicationOption.serialize(source.get()),
		});
	}

	function deserializeData(
		context: TallyContext<Player>,
		serialized: string
	): [SourceType<unknown>, "added" | "removed" | "updated", number, unknown] {
		const obj = JSON.parse(serialized);
		const sourceType = context.sources.get(obj.sourceId)!;
		const sourceEvent = obj.sourceEvent;
		const priority = obj.priority;
		const data = sourceType.definition.replication!.deserialize(obj.data);
		return [sourceType, sourceEvent, priority, data];
	}
	*/

	it("emits replication added", () => {
		const serverTally = new TallyContext<Player>();
		const serverAgent = serverTally.createAgentState({ name: "Bob" });

		const callback = vi.fn();
		serverTally.onReplicationEmit(callback);

		const source1 = serverAgent.addSource(PropSource, 100, { value: 5 });
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source1,
			"added",
			PropSource.definition.replication!
		);

		const source2 = serverAgent.addSource(PropSource, 100, { value: 5 });
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source2,
			"added",
			PropSource.definition.replication!
		);

		const source3 = serverAgent.addSource(PropSource, 100, { value: 5 });
		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source3,
			"added",
			PropSource.definition.replication!
		);
	});

	it("emits replication removed", () => {
		const serverTally = new TallyContext<Player>();
		const serverAgent = serverTally.createAgentState({ name: "Bob" });

		const callback = vi.fn();
		serverTally.onReplicationEmit(callback);

		const source1 = serverAgent.addSource(PropSource, 100, { value: 5 });
		const source2 = serverAgent.addSource(PropSource, 100, { value: 5 });
		const source3 = serverAgent.addSource(PropSource, 100, { value: 5 });

		source3!.destroy();
		expect(callback).toHaveBeenCalledTimes(4);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source3,
			"removed",
			PropSource.definition.replication!
		);

		source1!.destroy();
		expect(callback).toHaveBeenCalledTimes(5);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source1,
			"removed",
			PropSource.definition.replication!
		);

		source2!.destroy();
		expect(callback).toHaveBeenCalledTimes(6);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source2,
			"removed",
			PropSource.definition.replication!
		);

		source2!.destroy();
		expect(callback).toHaveBeenCalledTimes(6);
	});

	it("emits replication updated", () => {
		const serverTally = new TallyContext<Player>();
		const serverAgent = serverTally.createAgentState({ name: "Bob" });

		const callback = vi.fn();
		serverTally.onReplicationEmit(callback);

		const source1 = serverAgent.addSource(PropSource, 100, { value: 5 });
		const source2 = serverAgent.addSource(PropSource, 100, { value: 5 });
		const source3 = serverAgent.addSource(PropSource, 100, { value: 5 });

		source3!.set({ value: 8 });
		expect(callback).toHaveBeenCalledTimes(4);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source3,
			"updated",
			PropSource.definition.replication!
		);

		source1!.set({ value: 8 });
		expect(callback).toHaveBeenCalledTimes(5);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source1,
			"updated",
			PropSource.definition.replication!
		);

		source2!.set({ value: 8 });
		expect(callback).toHaveBeenCalledTimes(6);
		expect(callback).toHaveBeenCalledWith(
			serverAgent,
			source2,
			"updated",
			PropSource.definition.replication!
		);

		// TODO: Setting to same value should be a no-op
		source2!.set({ value: 8 });
		expect(callback).toHaveBeenCalledTimes(7);
	});
});

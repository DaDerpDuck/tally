import { describe, expect, it } from "vitest";
import { defineNumberProperty, defineSourceType, ReplicationReceiver, TallyContext } from "../src";

describe("replication", () => {
	const Prop = defineNumberProperty({ name: "Property", defaultValue: 0 });

	interface PropSourceData {
		value: number;
	}

	const PropSource = defineSourceType<PropSourceData>({
		name: "PropertySource",

		contribute: (data) => [Prop.add(data.value)],

		replication: {
			serialize(data): number {
				return data.value;
			},
			deserialize(serialized: number) {
				return { value: serialized };
			},
		},
	});

	interface Player {
		name: string;
	}

	it("receives source add", () => {
		const serverTally = new TallyContext<Player>();
		const serverAgent = serverTally.createAgentState({ name: "Bob" });
		serverTally.register(PropSource);
		serverTally.register(Prop);

		const clientTally = new TallyContext<Player>();
		const clientAgent = clientTally.createAgentState({ name: "Bob" });
		clientTally.register(PropSource);
		clientTally.register(Prop);

		const replicationReceiver = new ReplicationReceiver(clientAgent, (name) =>
			clientTally.sources.get(name)
		);

		serverTally.onReplicationEmit((_, event) => {
			replicationReceiver.apply([event]);
		});

		serverAgent.addSource(PropSource, 100, { value: 5 });

		expect(clientAgent.getSources().size).toBe(1);

		const clientSource = clientAgent.getSources(PropSource).values().toArray()[0];
		expect(clientSource.priority).toBe(100);
		expect(clientSource.get()).toEqual({ value: 5 });
	});

	it("receives source update", () => {
		const serverTally = new TallyContext<Player>();
		const serverAgent = serverTally.createAgentState({ name: "Bob" });
		serverTally.register(PropSource);
		serverTally.register(Prop);

		const clientTally = new TallyContext<Player>();
		const clientAgent = clientTally.createAgentState({ name: "Bob" });
		clientTally.register(PropSource);
		clientTally.register(Prop);

		const replicationReceiver = new ReplicationReceiver(clientAgent, (name) =>
			clientTally.sources.get(name)
		);

		serverTally.onReplicationEmit((_, event) => {
			replicationReceiver.apply([event]);
		});

		const serverSource = serverAgent.addSource(PropSource, 100, { value: 5 })!;
		expect(clientAgent.getSources().size).toBe(1);

		serverSource.set({ value: 10 });
		const clientSource = clientAgent.getSources(PropSource).values().toArray()[0];
		expect(clientSource.priority).toBe(100);
		expect(clientSource.get()).toEqual({ value: 10 });
	});

	it("receives source destroy", () => {
		const serverTally = new TallyContext<Player>();
		const serverAgent = serverTally.createAgentState({ name: "Bob" });
		serverTally.register(PropSource);
		serverTally.register(Prop);

		const clientTally = new TallyContext<Player>();
		const clientAgent = clientTally.createAgentState({ name: "Bob" });
		clientTally.register(PropSource);
		clientTally.register(Prop);

		const replicationReceiver = new ReplicationReceiver(clientAgent, (name) =>
			clientTally.sources.get(name)
		);

		serverTally.onReplicationEmit((_, event) => {
			replicationReceiver.apply([event]);
		});

		const serverSource = serverAgent.addSource(PropSource, 100, { value: 5 })!;
		expect(clientAgent.getSources().size).toBe(1);

        serverSource.destroy();
        expect(clientAgent.getSources().size).toBe(0);
	});

    // TODO: edge cases with multiple sources
});

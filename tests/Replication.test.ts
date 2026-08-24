import { describe, expect, it } from "vitest";
import { defineNumberProperty, defineSourceType, ReplicationReceiver, TallyContext } from "../src";

interface Player {
	name: string;
}

interface PropSourceData {
	value: number;
}

const Property = defineNumberProperty({ name: "Property", defaultValue: 0 });
const PropertySource = defineSourceType<PropSourceData>({
	name: "PropertySource",
	contribute: (data) => [Property.add(data.value)],
	replication: {
		serialize: (data) => data.value,
		deserialize: (value: number) => ({ value }),
	},
});

function createReplicationFixture() {
	const serverTally = new TallyContext<Player>();
	const serverAgent = serverTally.createAgentState({ name: "Bob" });
	serverTally.register(PropertySource);
	serverTally.register(Property);

	const clientTally = new TallyContext<Player>();
	const clientAgent = clientTally.createAgentState({ name: "Bob" });
	clientTally.register(PropertySource);
	clientTally.register(Property);

	const receiver = new ReplicationReceiver(clientAgent, (name) => clientTally.sources.get(name));
	serverTally.onReplicationEmit((_, event) => receiver.apply([event]));

	return { clientAgent, serverAgent };
}

function getClientSource(clientAgent: ReturnType<typeof createReplicationFixture>["clientAgent"]) {
	const sources = [...clientAgent.getSources(PropertySource)];
	expect(sources).toHaveLength(1);
	return sources[0]!;
}

describe("replication", () => {
	it("replicates source addition", () => {
		const { clientAgent, serverAgent } = createReplicationFixture();

		serverAgent.addSource(PropertySource, 100, { value: 5 });

		const clientSource = getClientSource(clientAgent);
		expect(clientSource.priority).toBe(100);
		expect(clientSource.get()).toEqual({ value: 5 });
		expect(clientAgent.get(Property)).toBe(5);
	});

	it("replicates source updates", () => {
		const { clientAgent, serverAgent } = createReplicationFixture();
		const serverSource = serverAgent.addSource(PropertySource, 100, { value: 5 })!;

		serverSource.set({ value: 10 });

		const clientSource = getClientSource(clientAgent);
		expect(clientSource.priority).toBe(100);
		expect(clientSource.get()).toEqual({ value: 10 });
		expect(clientAgent.get(Property)).toBe(10);
	});

	it("replicates source removal", () => {
		const { clientAgent, serverAgent } = createReplicationFixture();
		const serverSource = serverAgent.addSource(PropertySource, 100, { value: 5 })!;
		expect(clientAgent.getSources(PropertySource).size).toBe(1);

		serverSource.destroy();

		expect(clientAgent.getSources(PropertySource).size).toBe(0);
		expect(clientAgent.get(Property)).toBe(0);
	});

	// TODO: edge cases with multiple sources
});

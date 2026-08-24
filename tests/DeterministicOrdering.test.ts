import { describe, expect, it } from "vitest";
import {
	AgentState,
	defineSourceType,
	ModifierRegistry,
	type Modifier,
	type ModifierHandle,
	type Property,
	type Source,
	type SourceType,
} from "../src";

/**
 * Forward contract for deterministic ordering.
 *
 * These tests intentionally target behavior that does not exist yet. They should remain red until
 * modifier ordering no longer depends on insertion order.
 *
 * Resolution order is lexicographic:
 * 1. priority, ascending
 * 2. domain, authoritative before local
 * 3. sequence, ascending within the domain
 * 4. modifierIndex, ascending within one Source contribution
 */
type OrderingDomain = "authoritative" | "local";

interface ModifierOrder {
	readonly priority: number;
	readonly domain: OrderingDomain;
	readonly sequence: number;
	readonly modifierIndex: number;
}

interface SourceOrigin {
	readonly domain: OrderingDomain;
	readonly sequence: number;
}

interface AddSourceOptions {
	readonly priority?: number;
	readonly origin?: SourceOrigin;
}

const TraceProperty: Property<string> = {
	name: "DeterministicTrace",
	defaultValue: "",
	equals: (a, b) => a === b,
	resolve: (base, modifiers) =>
		modifiers.reduce((result, modifier) => result + String(modifier.value), base),
};

function traceModifier(label: string): Modifier<string> {
	return {
		property: TraceProperty,
		operation: "append",
		value: label,
	};
}

/**
 * Adapter for the planned ModifierRegistry API. Keeping this cast here lets this branch remain
 * test-only while still expressing the future ordering contract.
 */
function addOrderedModifier(registry: ModifierRegistry, label: string, order: ModifierOrder) {
	const add = registry.add as unknown as (
		property: Property<string>,
		modifier: Modifier<string>,
		order: ModifierOrder
	) => ModifierHandle;

	return add.call(registry, TraceProperty, traceModifier(label), order);
}

function resolveTrace(registry: ModifierRegistry) {
	return TraceProperty.resolve(TraceProperty.defaultValue, registry.get(TraceProperty));
}

function order(
	priority: number,
	domain: OrderingDomain,
	sequence: number,
	modifierIndex = 0
): ModifierOrder {
	return { priority, domain, sequence, modifierIndex };
}

describe("deterministic modifier ordering", () => {
	it("orders by priority before considering provenance", () => {
		const registry = new ModifierRegistry();

		addOrderedModifier(registry, "C", order(300, "authoritative", 0));
		addOrderedModifier(registry, "A", order(100, "local", 999));
		addOrderedModifier(registry, "B", order(200, "authoritative", 999));

		expect(resolveTrace(registry)).toBe("ABC");
	});

	it("orders authoritative modifiers before local modifiers at equal priority", () => {
		const registry = new ModifierRegistry();

		// Insert authoritative first specifically so insertion order cannot accidentally satisfy the test.
		addOrderedModifier(registry, "A", order(100, "authoritative", 50));
		addOrderedModifier(registry, "L", order(100, "local", 0));

		expect(resolveTrace(registry)).toBe("AL");
	});

	it("orders modifiers by sequence within the same priority and domain", () => {
		const registry = new ModifierRegistry();

		addOrderedModifier(registry, "A", order(100, "authoritative", 10));
		addOrderedModifier(registry, "C", order(100, "authoritative", 30));
		addOrderedModifier(registry, "B", order(100, "authoritative", 20));

		expect(resolveTrace(registry)).toBe("ABC");
	});

	it("orders modifiers from one Source by contribution index", () => {
		const registry = new ModifierRegistry();

		addOrderedModifier(registry, "A", order(100, "authoritative", 10, 0));
		addOrderedModifier(registry, "C", order(100, "authoritative", 10, 2));
		addOrderedModifier(registry, "B", order(100, "authoritative", 10, 1));

		expect(resolveTrace(registry)).toBe("ABC");
	});

	it("applies the full ordering key lexicographically", () => {
		const registry = new ModifierRegistry();

		// Deliberately scrambled insertion order.
		addOrderedModifier(registry, "F", order(200, "local", 0));
		addOrderedModifier(registry, "C", order(100, "authoritative", 20, 0));
		addOrderedModifier(registry, "A", order(100, "authoritative", 10, 0));
		addOrderedModifier(registry, "E", order(100, "local", 0, 0));
		addOrderedModifier(registry, "D", order(100, "authoritative", 20, 1));
		addOrderedModifier(registry, "B", order(100, "authoritative", 10, 1));

		expect(resolveTrace(registry)).toBe("ABCDEF");
	});

	it("produces the same resolution from different insertion histories", () => {
		const first = new ModifierRegistry();
		const second = new ModifierRegistry();

		const entries = [
			["A", order(100, "authoritative", 0)],
			["B", order(100, "authoritative", 1)],
			["C", order(100, "local", 0)],
			["D", order(200, "authoritative", 0)],
		] as const;

		for (const [label, modifierOrder] of entries)
			addOrderedModifier(first, label, modifierOrder);

		for (const index of [2, 3, 0, 1] as const) {
			const [label, modifierOrder] = entries[index];
			addOrderedModifier(second, label, modifierOrder);
		}

		expect(resolveTrace(first)).toBe("ABCD");
		expect(resolveTrace(second)).toBe("ABCD");
		expect(resolveTrace(second)).toBe(resolveTrace(first));
	});

	it("keeps authoritative and local sequence namespaces independent", () => {
		const registry = new ModifierRegistry();

		addOrderedModifier(registry, "L1", order(100, "local", 1));
		addOrderedModifier(registry, "A1", order(100, "authoritative", 1));
		addOrderedModifier(registry, "L0", order(100, "local", 0));
		addOrderedModifier(registry, "A0", order(100, "authoritative", 0));

		expect(resolveTrace(registry)).toBe("A0A1L0L1");
	});
});

interface OrderedSourceData {
	readonly label: string;
}

const OrderedSource = defineSourceType<OrderedSourceData>({
	name: "DeterministicOrderedSource",
	contribute: (data) => [
		{
			applyTo(registry, priority) {
				return registry.add(TraceProperty, traceModifier(data.label), priority);
			},
		},
	],
});

type FutureAddSource = (
	type: SourceType<OrderedSourceData>,
	data: OrderedSourceData,
	options?: AddSourceOptions
) => Source<OrderedSourceData> | undefined;

/**
 * Adapter for the planned addSource(type, data, options?) signature. The current implementation has
 * not adopted this API or provenance yet, so the integration tests below are intentionally red.
 */
function addOrderedSource(
	agent: AgentState<unknown>,
	label: string,
	origin: SourceOrigin,
	priority = 100
) {
	const addSource = agent.addSource as unknown as FutureAddSource;
	return addSource.call(agent, OrderedSource, { label }, { priority, origin })!;
}

describe("deterministic Source ordering integration", () => {
	it("does not let local creation time override authoritative ordering", () => {
		const agent = new AgentState({});

		addOrderedSource(agent, "L", { domain: "local", sequence: 0 });
		addOrderedSource(agent, "B", { domain: "authoritative", sequence: 1 });
		addOrderedSource(agent, "A", { domain: "authoritative", sequence: 0 });

		expect(agent.get(TraceProperty)).toBe("ABL");
	});

	it("keeps a Source in the same ordering position after it updates", () => {
		const agent = new AgentState({});

		const first = addOrderedSource(agent, "A", {
			domain: "authoritative",
			sequence: 0,
		});
		addOrderedSource(agent, "B", { domain: "authoritative", sequence: 1 });

		expect(agent.get(TraceProperty)).toBe("AB");

		first.set({ label: "A2" });

		// Updating removes and reapplies modifier handles. The Source must retain its semantic position.
		expect(agent.get(TraceProperty)).toBe("A2B");
	});

	it("converges when the same authoritative Sources are created in different local orders", () => {
		const firstAgent = new AgentState({});
		const secondAgent = new AgentState({});

		addOrderedSource(firstAgent, "A", { domain: "authoritative", sequence: 0 });
		addOrderedSource(firstAgent, "B", { domain: "authoritative", sequence: 1 });
		addOrderedSource(firstAgent, "C", { domain: "authoritative", sequence: 2 });

		addOrderedSource(secondAgent, "C", { domain: "authoritative", sequence: 2 });
		addOrderedSource(secondAgent, "A", { domain: "authoritative", sequence: 0 });
		addOrderedSource(secondAgent, "B", { domain: "authoritative", sequence: 1 });

		expect(firstAgent.get(TraceProperty)).toBe("ABC");
		expect(secondAgent.get(TraceProperty)).toBe("ABC");
		expect(secondAgent.get(TraceProperty)).toBe(firstAgent.get(TraceProperty));
	});
});

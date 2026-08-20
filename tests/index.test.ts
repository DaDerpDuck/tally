import { describe, expect, it, vi } from "vitest";
import { AgentState, defineNumberProperty, defineSourceType } from "../src/index.js";

describe("agent state", () => {
	const Poison = defineNumberProperty({
		id: 0,
		name: "Poison",
		defaultValue: 0,
	});

	interface PoisonData {
		intensity: number;
	}

	const PoisonSource = defineSourceType<PoisonData>({
		name: "Poison",
		duplicatePolicy: "ignore",

		create(data) {
			return { modifiers: [Poison.add(data.intensity)] };
		},
	});

	it("adds source", () => {
		const agent = new AgentState();
		agent.addSource(PoisonSource, 100, { intensity: 5 });
		expect(agent.get(Poison)).toBe(5);
	});

	it("has property observation on source add", () => {
		const agent = new AgentState();
		const callback = vi.fn();

		agent.observe(Poison, callback);
		agent.addSource(PoisonSource, 100, { intensity: 5 });

		expect(callback).toHaveBeenCalledWith(5, 0);
	});

	it("has property observation on source set", () => {
		const agent = new AgentState();
		const callback = vi.fn();

		agent.observe(Poison, callback);

		const poisonSource = agent.addSource(PoisonSource, 100, { intensity: 5 })!;
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(5, 0);

		poisonSource.set({ intensity: 2 });
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith(2, 5);
	});

	it("has property observation on source destroy", () => {
		const agent = new AgentState();
		const callback = vi.fn();

		agent.observe(Poison, callback);

		const poisonSource = agent.addSource(PoisonSource, 100, { intensity: 5 })!;
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(5, 0);

		poisonSource.destroy();
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith(0, 5);
	});

	it("disconnects source observation", () => {
		const agent = new AgentState();
		const callback = vi.fn();

		const disconnect = agent.observe(Poison, callback);
		disconnect();
		agent.addSource(PoisonSource, 100, { intensity: 5 });

		expect(callback).toHaveBeenCalledTimes(0);
	});

	it("checks has source", () => {
		const agent = new AgentState();

		expect(agent.hasSource(PoisonSource)).toBe(false);

		const source = agent.addSource(PoisonSource, 100, { intensity: 100 })!;
		expect(agent.hasSource(PoisonSource)).toBe(true);

		source.destroy();
		expect(agent.hasSource(PoisonSource)).toBe(false);
	});

	it("handles duplicate policy 'allow'", () => {
		const agent = new AgentState();

		const DupAllowSource = defineSourceType<void>({
			name: "Dummy",
			duplicatePolicy: "allow",
			create() {
				return { modifiers: [] };
			},
		});

		const source1 = agent.addSource(DupAllowSource, 0);
		expect(source1).toBeDefined();
		expect(agent.getSource(DupAllowSource)).toEqual(new Set([source1]));

		const source2 = agent.addSource(DupAllowSource, 0);
		expect(source2).toBeDefined();
		expect(agent.getSource(DupAllowSource)).toEqual(new Set([source1, source2]));

		source2!.destroy();

		const source3 = agent.addSource(DupAllowSource, 0);
		expect(source3).toBeDefined();
		expect(agent.getSource(DupAllowSource)).toEqual(new Set([source1, source3]));
	});

	it("handles duplicate policy 'ignore'", () => {
		const agent = new AgentState();

		const DupIgnoreSource = defineSourceType<void>({
			name: "Dummy",
			duplicatePolicy: "ignore",
			create() {
				return { modifiers: [] };
			},
		});

		const source1 = agent.addSource(DupIgnoreSource, 0);
		expect(source1).toBeDefined();
		expect(agent.getSource(DupIgnoreSource)).toEqual(new Set([source1]));

		const source2 = agent.addSource(DupIgnoreSource, 0);
		expect(source2).toBeUndefined();
		expect(agent.getSource(DupIgnoreSource)).toEqual(new Set([source1]));

		source1!.destroy();

		const source3 = agent.addSource(DupIgnoreSource, 0);
		expect(source3).toBeDefined();
		expect(agent.getSource(DupIgnoreSource)).toEqual(new Set([source3]));
	});

	it("handles duplicate policy 'replace'", () => {
		const agent = new AgentState();

		const DupReplaceSource = defineSourceType<void>({
			name: "Dummy",
			duplicatePolicy: "replace",
			create() {
				return { modifiers: [] };
			},
		});

		const source1 = agent.addSource(DupReplaceSource, 0);
		expect(source1).toBeDefined();
		expect(agent.getSource(DupReplaceSource)).toEqual(new Set([source1]));

		const source2 = agent.addSource(DupReplaceSource, 0);
		expect(source2).toBeDefined();
		expect(agent.getSource(DupReplaceSource)).toEqual(new Set([source2]));

		source2!.destroy();

		const source3 = agent.addSource(DupReplaceSource, 0);
		expect(source3).toBeDefined();
		expect(agent.getSource(DupReplaceSource)).toEqual(new Set([source3]));
	});

	it("handles duplicate policy 'reconcile'", () => {
		const agent = new AgentState();

		const reconcile = vi.fn();

		const DupReconcileSource = defineSourceType<void>({
			name: "Dummy",
			duplicatePolicy: "reconcile",
			create() {
				return { modifiers: [] };
			},
			reconcile,
		});

		const source1 = agent.addSource(DupReconcileSource, 0);
		expect(source1).toBeDefined();
		expect(agent.getSource(DupReconcileSource)).toEqual(new Set([source1]));
		expect(reconcile).toHaveBeenCalledTimes(0);

		const source2 = agent.addSource(DupReconcileSource, 0);
		expect(source2).toBeUndefined();
		expect(agent.getSource(DupReconcileSource)).toEqual(new Set([source1]));
		expect(reconcile).toHaveBeenCalledTimes(1);

		source1!.destroy();

		const source3 = agent.addSource(DupReconcileSource, 0);
		expect(source3).toBeDefined();
		expect(agent.getSource(DupReconcileSource)).toEqual(new Set([source3]));
		expect(reconcile).toHaveBeenCalledTimes(1);
	});
});

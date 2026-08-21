import { describe, expect, it, vi } from "vitest";
import { defineBooleanProperty, defineNumberProperty, defineSourceType, Tally } from "../src";

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
		const tally = new Tally();
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
		const tally = new Tally();
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
		const tally = new Tally();
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
		const tally = new Tally();
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
		const tally = new Tally();
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

	it("registers idempotently", () => {
		const tally = new Tally();
		expect(tally.properties.size).toBe(0);

		const property = tally.register(
			defineBooleanProperty({ name: "Boolean", defaultValue: false })
		);
		tally.register(property);
		expect(tally.properties.size).toBe(1);
		expect(tally.properties.get("Boolean")).toBe(property);

		tally.register(property);
		expect(tally.properties.size).toBe(1);
		expect(tally.properties.get("Boolean")).toBe(property);
	});
});

import { AgentState } from "../../src";
import { BENCH_SIZES, createBench, runBench } from "../shared/bench";
import { createSourceType } from "../shared/fixtures";

const bench = createBench("Duplication");

const allowSourceType = createSourceType({
	duplication: {
		policy: "allow",
	},
});

for (const size of BENCH_SIZES) {
	const agent = new AgentState(undefined);

	bench.add(
		`allow / ${size} sources`,
		() => {
			for (let i = 0; i < size; i++) {
				agent.addSource(allowSourceType);
			}
		},
		{
			async: false,
			afterEach() {
				agent.destroyAllSources();
			},
		}
	);
}

const ignoreSourceType = createSourceType({
	duplication: {
		policy: "ignore",
	},
});

for (const size of BENCH_SIZES) {
	const agent = new AgentState(undefined);

	bench.add(
		`ignore / ${size} sources`,
		() => {
			for (let i = 0; i < size; i++) {
				agent.addSource(ignoreSourceType);
			}
		},
		{
			async: false,
			afterEach() {
				agent.destroyAllSources();
			},
		}
	);
}

const replaceSourceType = createSourceType({
	duplication: {
		policy: "replace",
	},
});

for (const size of BENCH_SIZES) {
	const agent = new AgentState(undefined);

	bench.add(
		`replace / ${size} sources`,
		() => {
			for (let i = 0; i < size; i++) {
				agent.addSource(replaceSourceType);
			}
		},
		{
			async: false,
			afterEach() {
				agent.destroyAllSources();
			},
		}
	);
}

const reconcileSourceType = createSourceType({
	duplication: {
		policy: "reconcile",
		reconcile(existing, incoming) {},
	},
});

for (const size of BENCH_SIZES) {
	const agent = new AgentState(undefined);

	bench.add(
		`reconcile / ${size} sources`,
		() => {
			for (let i = 0; i < size; i++) {
				agent.addSource(reconcileSourceType);
			}
		},
		{
			async: false,
			afterEach() {
				agent.destroyAllSources();
			},
		}
	);
}

await runBench(bench);

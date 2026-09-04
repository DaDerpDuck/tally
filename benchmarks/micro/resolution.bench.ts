import { AgentState, type Source, type SourceType } from "../../src/index.js";
import { BENCH_SIZES, createBench, HEAVY_BENCH_OPTIONS, runBench } from "../shared/bench.js";
import { createNumberSourceFixture } from "../shared/fixtures.js";

const resolution = createBench("Property resolution: update one modifier", {
	...HEAVY_BENCH_OPTIONS,
	iterations: 128,
});

for (const size of BENCH_SIZES) {
	let agent: AgentState<undefined>;
	let type: SourceType<number>;
	let target: Source<number>;
	let value = 1;

	resolution.add(
		`${size} total modifiers`,
		() => {
			value = value === 1 ? 2 : 1;
			target.set(value);
		},
		{
			async: false,
			beforeAll() {
				({ agent, type } = createNumberSourceFixture());
				agent.batch(() => {
					for (let i = 1; i < size; i++) agent.addSource(type, 1);
					target = agent.addSource(type, value)!;
				});
			},
			afterAll() {
				agent.destroy();
			},
		}
	);
}

runBench(resolution);

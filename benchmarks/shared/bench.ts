import { Bench, BenchOptions } from "tinybench";

export function createBench(name: string, options?: BenchOptions): Bench {
	const bench = new Bench({
		name,
		time: 1_000,
		warmup: true,
		warmupTime: 500,
		timestampProvider: "auto",
		throws: true,
		...options,
	});

	bench.addEventListener("warning", (event) => {
		console.warn(`[benchmark warning] ${event.task?.name}: ${event.reason}`);
	});

	return bench;
}

export async function runBench(bench: Bench): Promise<void> {
	await bench.run();

	console.log(`\n${bench.name}`);
	console.table(bench.table());
}

export const BENCH_SIZES = [1, 10, 100, 1000, 10000] as const;

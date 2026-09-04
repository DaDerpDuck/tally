import { Bench, type BenchOptions } from "tinybench";

const DEFAULT_OPTIONS = {
	// Tinybench stores samples while calculating statistics. Fixed counts prevent
	// very fast tasks from collecting millions of samples in a timed run.
	time: 0,
	iterations: 1_000,
	warmup: true,
	warmupTime: 0,
	warmupIterations: 100,
	retainSamples: false,
	timestampProvider: "auto",
	throws: true,
} as const satisfies BenchOptions;

export function createBench(name: string, options?: BenchOptions): Bench {
	const bench = new Bench({
		name,
		...DEFAULT_OPTIONS,
		...options,
	});

	bench.addEventListener("warning", (event) => {
		console.warn(`[benchmark warning] ${event.task?.name}: ${event.reason}`);
	});

	return bench;
}

export function runBench(bench: Bench): void {
	bench.runSync();

	const result = bench.tasks[0]?.result;
	const environment = result
		? ` (${result.runtime} ${result.runtimeVersion}, ${result.timestampProviderName})`
		: "";
	console.log(`\n${bench.name}${environment}`);
	console.table(bench.table());
}

export const BENCH_SIZES = [1, 10, 100, 1_000, 10_000] as const;

export const HEAVY_BENCH_OPTIONS = {
	time: 0,
	iterations: 128,
	warmupTime: 0,
	warmupIterations: 16,
} as const satisfies BenchOptions;

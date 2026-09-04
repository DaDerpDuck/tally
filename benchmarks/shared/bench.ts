import { arch, cpus, platform } from "os";
import { Bench, mToNs, type BenchOptions } from "tinybench";

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

export interface BenchmarkTaskReport {
	name: string;
	samples: number;
	latencyMedianNs: number;
	latencyMeanNs: number;
	latencyP99Ns: number;
	rme: number;
}

export interface BenchmarkSuiteReport {
	name: string;
	iterations: number;
	warmupIterations: number;
	tasks: BenchmarkTaskReport[];
}

const reports: BenchmarkSuiteReport[] = [];

export function runBench(bench: Bench): void {
	bench.runSync();

	const tasks = bench.tasks.map((task): BenchmarkTaskReport => {
		const result = bench.tasks[0]?.result;

		if (result.state !== "completed") {
			throw new Error(`Benchmark "${task.name}" did not complete`);
		}

		return {
			name: task.name,
			samples: result.latency.samplesCount,
			latencyMedianNs: mToNs(result.latency.p50),
			latencyMeanNs: mToNs(result.latency.mean),
			latencyP99Ns: mToNs(result.latency.p99),
			rme: result.latency.rme,
		};
	});

	reports.push({
		name: bench.name ?? "Unnamed suite",
		iterations: bench.iterations,
		warmupIterations: bench.warmupIterations,
		tasks,
	});

	console.log(`\n${bench.name}`);
	console.table(bench.table());
}

export function createBenchmarkReport(commit: string) {
	return {
		schemaVersion: 1,
		commit,
		timestamp: new Date().toISOString(),

		environment: {
			runtime: "node",
			runtimeVersion: process.versions.node,
			platform: platform(),
			architecture: arch(),
			cpu: cpus()[0]?.model ?? "unknown",
		},

		suites: reports,
	};
}

export const BENCH_SIZES = [1, 10, 100, 1_000, 10_000] as const;

export const HEAVY_BENCH_OPTIONS = {
	time: 0,
	iterations: 128,
	warmupTime: 0,
	warmupIterations: 16,
} as const satisfies BenchOptions;

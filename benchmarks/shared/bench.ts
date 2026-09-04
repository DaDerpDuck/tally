import { arch, cpus, platform } from "os";
import { Bench, FnOptions, mToNs, type BenchOptions } from "tinybench";

const DEFAULT_OPTIONS = {
	// Tinybench stores samples while calculating statistics. Fixed counts prevent
	// very fast tasks from collecting millions of samples in a timed run.
	time: 50,
	iterations: 1000,
	warmup: true,
	warmupTime: 50,
	warmupIterations: 100,
	retainSamples: false,
	timestampProvider: "auto",
	throws: true,
} as const satisfies BenchOptions;

export const HEAVY_BENCH_OPTIONS = {
	time: 50,
	iterations: 20,
	warmupTime: 50,
	warmupIterations: 5,
} as const satisfies BenchOptions;

export const BENCH_SIZES = [1, 10, 100, 1_000, 10_000] as const;

export type BenchmarkLogLevel = "silent" | "warn" | "info";

let logLevel: BenchmarkLogLevel = "info";

export function setBenchmarkLogLevel(nextLevel: BenchmarkLogLevel) {
	logLevel = nextLevel;
}

function shouldLog(level: Exclude<BenchmarkLogLevel, "silent">) {
	const priorities = {
		silent: 0,
		warn: 1,
		info: 2,
	} as const satisfies Record<BenchmarkLogLevel, number>;

	return priorities[logLevel] >= priorities[level];
}

export function createBench(name: string, options?: BenchOptions): Bench {
	const bench = new Bench({
		name,
		...DEFAULT_OPTIONS,
		...options,
	});

	bench.addEventListener("warning", (event) => {
		if (!shouldLog("warn")) return;
		console.warn(`[benchmark warning] ${event.task.name}: ${event.reason}`);
	});

	return bench;
}

export function addBatchedTask(
	bench: Bench,
	name: string,
	operationsPerSample: number,
	operation: () => void,
	options?: FnOptions
) {
	return bench.add(
		name,
		() => {
			const startedAt = bench.now();

			for (let i = 0; i < operationsPerSample; i++) {
				operation();
			}

			return {
				overriddenDuration: (bench.now() - startedAt) / operationsPerSample,
			};
		},
		{ async: false, ...options }
	);
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

	if (!shouldLog("info")) return;

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

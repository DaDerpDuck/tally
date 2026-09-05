import { arch, cpus, platform } from "node:os";
import {
	Bench,
	mToNs,
	type BenchOptions,
	type FnOptions,
	type TimerSaturationReason,
} from "tinybench";

const DEFAULT_OPTIONS = {
	// The time window supplies useful sampling; the iteration counts also guarantee
	// enough observations for slower tasks.
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

const WARNING_GUIDANCE = {
	"low-distinct": "Increase the work per sample so the timer sees more distinct values.",
	"zero-dominated": "Batch more work into each sample; most measurements hit zero.",
	"zero-mad": "Batch more work into each sample; the task is timer-quantized.",
} as const satisfies Record<TimerSaturationReason, string>;

let logLevel: BenchmarkLogLevel = "info";
const warningsByBench = new WeakMap<Bench, Map<string, Set<TimerSaturationReason>>>();
const operationsPerSampleByBench = new WeakMap<Bench, Map<string, number>>();

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
	const warnings = new Map<string, Set<TimerSaturationReason>>();
	warningsByBench.set(bench, warnings);
	operationsPerSampleByBench.set(bench, new Map());

	bench.addEventListener("warning", (event) => {
		if (event.reason) {
			const taskWarnings = warnings.get(event.task.name) ?? new Set();
			taskWarnings.add(event.reason);
			warnings.set(event.task.name, taskWarnings);
		}

		if (!shouldLog("warn")) return;
		console.warn(
			`[benchmark warning] ${name}: ${event.task.name}: ${event.reason}. ` +
				(event.reason ? WARNING_GUIDANCE[event.reason] : "Inspect this task's timing.")
		);
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
	if (!Number.isSafeInteger(operationsPerSample) || operationsPerSample < 1) {
		throw new Error("operationsPerSample must be a positive safe integer");
	}

	const task = bench.add(
		name,
		() => {
			for (let i = 0; i < operationsPerSample; i++) {
				operation();
			}
		},
		{ async: false, ...options }
	);

	const batchSizes = operationsPerSampleByBench.get(bench) ?? new Map();
	batchSizes.set(name, operationsPerSample);
	operationsPerSampleByBench.set(bench, batchSizes);

	return task;
}

export interface BenchmarkTaskReport {
	name: string;
	samples: number;
	latencyMedianNs: number;
	latencyMeanNs: number;
	latencyP99Ns: number;
	rme: number;
	operationsPerSample: number;
	warnings: TimerSaturationReason[];
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
	const warnings = warningsByBench.get(bench);
	const batchSizes = operationsPerSampleByBench.get(bench);

	const tasks = bench.tasks.map((task): BenchmarkTaskReport => {
		const result = task.result;
		const operationsPerSample = batchSizes?.get(task.name) ?? 1;

		if (result.state !== "completed") {
			throw new Error(`Benchmark "${task.name}" did not complete`);
		}

		return {
			name: task.name,
			samples: result.latency.samplesCount,
			latencyMedianNs: mToNs(result.latency.p50) / operationsPerSample,
			latencyMeanNs: mToNs(result.latency.mean) / operationsPerSample,
			latencyP99Ns: mToNs(result.latency.p99) / operationsPerSample,
			rme: result.latency.rme,
			operationsPerSample,
			warnings: [...(warnings?.get(task.name) ?? [])],
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
	console.table(
		tasks.map((task) => ({
			"Task name": task.name,
			"Latency avg (ns/op)": `${task.latencyMeanNs.toFixed(2)} ± ${task.rme.toFixed(2)}%`,
			"Latency med (ns/op)": task.latencyMedianNs.toFixed(2),
			"Latency p99 (ns/op)": task.latencyP99Ns.toFixed(2),
			Samples: task.samples,
			"Ops/sample": task.operationsPerSample,
		}))
	);
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

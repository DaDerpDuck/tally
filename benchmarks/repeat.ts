import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { BenchmarkLogLevel } from "./shared/bench.js";

interface TaskReport {
	name: string;
	latencyMedianNs: number;
	latencyMeanNs: number;
	latencyP99Ns: number;
	rme: number;
	samples: number;
	operationsPerSample: number;
	warnings: string[];
}

interface SuiteReport {
	name: string;
	tasks: TaskReport[];
}

interface BenchmarkReport {
	schemaVersion: number;
	commit: string;
	timestamp: string;
	environment: Record<string, unknown>;
	suites: SuiteReport[];
}

interface AggregatedTaskReport {
	name: string;
	medianOfMedianNs: number;
	minMedianNs: number;
	maxMedianNs: number;
	runMedianNs: number[];
	spreadPercent: number | null;
	operationsPerSample: number;
	warnings: string[];
}

function median(values: readonly number[]): number {
	if (values.length === 0) {
		throw new Error("Cannot calculate the median of an empty collection");
	}

	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 1) return sorted[middle]!;

	return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

const validLogLevels = new Set<BenchmarkLogLevel>(["silent", "warn", "info"]);
const { values } = parseArgs({
	options: {
		runs: { type: "string", default: "5" },
		output: { type: "string" },
		"log-level": { type: "string", default: "warn" },
	},
});

const runs = Number(values.runs);
const logLevel = values["log-level"] as BenchmarkLogLevel;

if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");
if (!validLogLevels.has(logLevel)) {
	throw new Error(`Invalid log level "${logLevel}". Expected silent, warn, or info.`);
}

if (runs % 2 === 0 && logLevel !== "silent") {
	console.warn("An odd run count such as 5 or 7 gives a natural median run");
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "tally-benchmarks-"));

const reports: BenchmarkReport[] = [];

try {
	for (let run = 1; run <= runs; run++) {
		const runOutput = join(temporaryDirectory, `run-${run}.json`);

		if (logLevel === "info") {
			console.log(`\nRunning benchmark suite (run ${run}/${runs})...`);
		}

		execFileSync(
			process.execPath,
			[
				"--import",
				"tsx",
				"benchmarks/run.ts",
				"--output",
				runOutput,
				"--log-level",
				logLevel,
			],
			{ stdio: "inherit" }
		);

		reports.push(JSON.parse(await readFile(runOutput, "utf8")) as BenchmarkReport);
	}

	const firstReport = reports[0]!;

	const suites = firstReport.suites.map((suite) => {
		const tasks: AggregatedTaskReport[] = suite.tasks.map((task) => {
			const runMedianNs = reports.map((report) => {
				const matchingSuite = report.suites.find((s) => s.name === suite.name);
				const matchingTask = matchingSuite?.tasks.find((t) => t.name === task.name);
				if (!matchingTask) {
					throw new Error(
						`Task "${task.name}" not found in suite "${suite.name}" for run ${report.commit}`
					);
				}

				return matchingTask.latencyMedianNs;
			});
			const medianOfMedianNs = median(runMedianNs);
			const minMedianNs = Math.min(...runMedianNs);
			const maxMedianNs = Math.max(...runMedianNs);

			return {
				name: task.name,
				medianOfMedianNs,
				minMedianNs,
				maxMedianNs,
				runMedianNs,
				spreadPercent:
					medianOfMedianNs === 0
						? null
						: ((maxMedianNs - minMedianNs) / medianOfMedianNs) * 100,
				operationsPerSample: task.operationsPerSample,
				warnings: [
					...new Set(
						reports.flatMap(
							(report) =>
								report.suites
									.find((candidate) => candidate.name === suite.name)
									?.tasks.find((candidate) => candidate.name === task.name)
									?.warnings ?? []
						)
					),
				],
			};
		});

		return {
			name: suite.name,
			tasks,
		};
	});

	const aggregatedReport = {
		schemaVersion: 1,
		commit: firstReport.commit,
		timestamp: new Date().toISOString(),
		environment: firstReport.environment,
		runs,
		suites,
	};
	const outputPath = resolve(
		values.output ??
			join("benchmarks", "results", `benchmark-${firstReport.commit.slice(0, 8)}.json`)
	);

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(aggregatedReport, null, 2)}\n`);

	if (logLevel === "info") {
		console.log(`\nWrote aggregated results to ${outputPath}`);
	}
} finally {
	await rm(temporaryDirectory, {
		recursive: true,
		force: true,
	});
}

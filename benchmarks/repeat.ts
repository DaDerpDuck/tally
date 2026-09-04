import { execFileSync } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";

interface TaskReport {
	name: string;
	latencyMedianNs: number;
	latencyMeanNs: number;
	latencyP99Ns: number;
	rme: number;
	samples: number;
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
}

function getArgument(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index === -1 ? undefined : process.argv[index + 1];
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

const runs = Number(getArgument("--runs") ?? "5");
const outputPath = resolve(getArgument("--output") ?? "benchmark-results.json");

if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");

if (runs % 2 === 0) console.warn("An odd run count such as 5 or 7 gives a natural median run");

const temporaryDirectory = await mkdtemp(join(tmpdir(), "tally-benchmarks-"));

const reports: BenchmarkReport[] = [];

try {
	for (let run = 1; run <= runs; run++) {
		const runOutput = join(temporaryDirectory, `run-${run}.json`);

		console.log(`\nRunning benchmark suite (run ${run}/${runs})...`);

		execFileSync(
			process.execPath,
			["--import", "tsx", "benchmarks/run.ts", "--output", runOutput],
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

				return matchingTask.latencyMeanNs;
			});

			return {
				name: task.name,
				medianOfMedianNs: median(runMedianNs),
				minMedianNs: Math.min(...runMedianNs),
				maxMedianNs: Math.max(...runMedianNs),
				runMedianNs,
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

	await writeFile(outputPath, `${JSON.stringify(aggregatedReport, null, 2)}\n`);

	console.log(`\nWrote aggregated results to ${outputPath}`);
} finally {
	await rm(temporaryDirectory, {
		recursive: true,
		force: true,
	});
}

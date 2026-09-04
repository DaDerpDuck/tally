import { execFileSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { parseArgs } from "util";
import { BenchmarkLogLevel, createBenchmarkReport, setBenchmarkLogLevel } from "./shared/bench.js";

const validLogLevels = new Set<BenchmarkLogLevel>(["silent", "warn", "info"]);

const { values, positionals } = parseArgs({
	options: {
		output: {
			type: "string",
		},
		"log-level": {
			type: "string",
			default: "info",
		},
	},
	allowPositionals: true,
});

const requestedLogLevel = values["log-level"];

if (
	typeof requestedLogLevel !== "string" ||
	!validLogLevels.has(requestedLogLevel as BenchmarkLogLevel)
) {
	throw new Error(`Invalid log level "${requestedLogLevel}". Expected silent, warn, or info.`);
}

setBenchmarkLogLevel(requestedLogLevel as BenchmarkLogLevel);

const suites = {
	duplication: () => import("./micro/duplication.bench.js"),
	lifecycle: () => import("./micro/lifecycle.bench.js"),
	resolution: () => import("./micro/resolution.bench.js"),
	replication: () => import("./micro/replication.bench.js"),
} as const;

const output = values.output;
const requested = positionals.length === 0 ? Object.keys(suites) : positionals;

for (const suite of requested) {
	if (!(suite in suites)) {
		throw new Error(
			`Unknown benchmark suite "${suite}". Expected one of: ${Object.keys(suites).join(", ")}`
		);
	}

	await suites[suite as keyof typeof suites]();
}

if (output) {
	const commit = execFileSync("git", ["rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();

	const outputPath = resolve(output);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(createBenchmarkReport(commit), null, 2)}\n`);
}

export { };


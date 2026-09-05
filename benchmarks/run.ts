import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	createBenchmarkReport,
	setBenchmarkLogLevel,
	setBenchmarkProfile,
	type BenchmarkLogLevel,
	type BenchmarkProfile,
} from "./shared/bench.js";

const validLogLevels = new Set<BenchmarkLogLevel>(["silent", "warn", "info"]);
const validProfileLevels = new Set<BenchmarkProfile>(["default", "quick", "comparison"]);

const { values, positionals } = parseArgs({
	options: {
		output: {
			type: "string",
		},
		profile: {
			type: "string",
			default: "default",
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

const requestedProfile = values.profile;
if (
	typeof requestedProfile !== "string" ||
	!validProfileLevels.has(requestedProfile as BenchmarkProfile)
) {
	throw new Error(
		`Invalid benchmark profile "${requestedProfile}". Expected default, quick, or comparison.`
	);
}

setBenchmarkLogLevel(requestedLogLevel as BenchmarkLogLevel);
setBenchmarkProfile(requestedProfile as BenchmarkProfile);

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

export {};

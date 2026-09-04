import { execFileSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { createBenchmarkReport } from "./shared/bench.js";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");

const output = outputIndex === -1 ? undefined : args[outputIndex + 1];

if (outputIndex !== -1) args.splice(outputIndex, 2);

const suites = {
	duplication: () => import("./micro/duplication.bench.js"),
	lifecycle: () => import("./micro/lifecycle.bench.js"),
	resolution: () => import("./micro/resolution.bench.js"),
	replication: () => import("./micro/replication.bench.js"),
} as const;

const requested = args.length === 0 ? Object.keys(suites) : args;

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


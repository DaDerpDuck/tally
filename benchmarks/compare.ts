import { readFile, writeFile } from "node:fs/promises";

interface Report {
	commit: string;
	suites: Array<{
		name: string;
		tasks: Array<{
			name: string;
			medianOfMedianNs: number;
		}>;
	}>;
}

const [, , baselinePath, candidatePath, outputPath] = process.argv;

if (!baselinePath || !candidatePath || !outputPath)
	throw new Error("Usage: compare.ts <baseline.json> <candidate.json> <output.md>");

const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as Report;
const candidate = JSON.parse(await readFile(candidatePath, "utf8")) as Report;

const baselineTasks = new Map(
	baseline.suites.flatMap((suite) =>
		suite.tasks.map((task) => [`${suite.name}: *${task.name}*`, task] as const)
	)
);

const rows = candidate.suites.flatMap((suite) =>
	suite.tasks.flatMap((task) => {
		const key = `${suite.name}: *${task.name}*` as const;
		const previous = baselineTasks.get(key);

		if (!previous) return [];

		const change = (task.medianOfMedianNs / previous.medianOfMedianNs - 1) * 100;

		return [
			`| ${key} | ${previous.medianOfMedianNs.toFixed(0)} | ` +
				`${task.medianOfMedianNs.toFixed(0)} | ` +
				`${change >= 0 ? "+" : ""}${change.toFixed(1)} |`,
		];
	})
);

const markdown = [
	"# Benchmark comparison",
	"",
	`Baseline: \`${baseline.commit.slice(0, 8)}\``,
	"",
	`Candidate: \`${candidate.commit.slice(0, 8)}\``,
	"",
	"| Benchmark | Baseline median (ns) | Candidate median (ns) | Change |",
	"|---|---:|---:|---:|",
	...rows,
	"",
].join("\n");

await writeFile(outputPath, markdown);

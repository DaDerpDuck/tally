const suites = {
	duplication: () => import("./micro/duplication.bench.js"),
	lifecycle: () => import("./micro/lifecycle.bench.js"),
	resolution: () => import("./micro/resolution.bench.js"),
	replication: () => import("./micro/replication.bench.js"),
} as const;

type SuiteName = keyof typeof suites;

const requestedSuites = process.argv.slice(2);
const suiteNames =
	requestedSuites.length === 0 ? (Object.keys(suites) as SuiteName[]) : requestedSuites;

for (const suiteName of suiteNames) {
	if (!(suiteName in suites)) {
		throw new Error(
			`Unknown benchmark suite "${suiteName}". Expected one of: ${Object.keys(suites).join(", ")}`
		);
	}

	await suites[suiteName as SuiteName]();
}

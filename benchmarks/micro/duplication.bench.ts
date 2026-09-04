import { AgentState, type Source } from "../../src/index.js";
import { createBench, runBench } from "../shared/bench.js";
import { createSourceType } from "../shared/fixtures.js";

const firstAdmission = createBench("Source duplication: first admission");

for (const policy of ["allow", "ignore", "replace"] as const) {
	const type = createSourceType({ duplication: { policy } });
	const agent = new AgentState(undefined);
	let added: Source<undefined> | undefined;

	firstAdmission.add(
		policy,
		() => {
			added = agent.addSource(type);
		},
		{
			async: false,
			afterEach() {
				added?.destroy();
				added = undefined;
			},
		}
	);
}

{
	const type = createSourceType({
		duplication: { policy: "reconcile", reconcile() {} },
	});
	const agent = new AgentState(undefined);
	let added: Source<undefined> | undefined;

	firstAdmission.add(
		"reconcile",
		() => {
			added = agent.addSource(type);
		},
		{
			async: false,
			afterEach() {
				added?.destroy();
				added = undefined;
			},
		}
	);
}

runBench(firstAdmission);

const conflictingAdmission = createBench("Source duplication: conflicting admission");

{
	const type = createSourceType({ duplication: { policy: "allow" } });
	const agent = new AgentState(undefined);
	let added: Source<undefined> | undefined;

	conflictingAdmission.add(
		"allow",
		() => {
			added = agent.addSource(type);
		},
		{
			async: false,
			beforeAll() {
				agent.addSource(type);
			},
			afterEach() {
				added?.destroy();
				added = undefined;
			},
			afterAll() {
				agent.destroyAllSources();
			},
		}
	);
}

for (const policy of ["ignore", "replace"] as const) {
	const type = createSourceType({ duplication: { policy } });
	const agent = new AgentState(undefined);

	conflictingAdmission.add(
		policy,
		() => {
			agent.addSource(type);
		},
		{
			async: false,
			beforeAll() {
				agent.addSource(type);
			},
			afterAll() {
				agent.destroyAllSources();
			},
		}
	);
}

{
	const type = createSourceType({
		duplication: { policy: "reconcile", reconcile() {} },
	});
	const agent = new AgentState(undefined);

	conflictingAdmission.add(
		"reconcile",
		() => {
			agent.addSource(type);
		},
		{
			async: false,
			beforeAll() {
				agent.addSource(type);
			},
			afterAll() {
				agent.destroyAllSources();
			},
		}
	);
}

runBench(conflictingAdmission);

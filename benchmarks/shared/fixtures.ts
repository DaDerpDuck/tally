import { AgentState, defineSourceType, SourceType, SourceTypeDefinition } from "../../src";

export function createSourceType(options?: Partial<SourceTypeDefinition<undefined>>) {
	const SourceType = defineSourceType<undefined>({
		name: "SourceType",
		priority: 0,
		contribute() {
			return [];
		},
		...options,
	});

	return SourceType;
}

export function createAgentWithSources(count: number, type: SourceType<undefined>) {
	const agent = new AgentState(undefined);

	for (let i = 0; i < count; i++) {
		agent.addSource(type);
	}

	return agent;
}

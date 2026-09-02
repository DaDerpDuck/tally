import {
	type DuplicationGroupMember,
	DuplicationGroupMemberInstance,
	type DuplicationGroupMemberOptions,
} from "./DuplicationGroupMember.js";

const DuplicationGroupSymbol: unique symbol = Symbol("duplicationGroup");
export function isDuplicationGroup(o: object): o is DuplicationGroup {
	return DuplicationGroupSymbol in o;
}

export type DuplicationGroupDefinition =
	| {
			readonly policy: "ignore";
			readonly maxStack?: number;
			readonly selector?: undefined;
	  }
	| {
			readonly policy: "replace";
			readonly maxStack?: undefined;
			readonly selector?: undefined;
	  }
	| {
			readonly policy: "replace";
			readonly maxStack: number;
			readonly selector: "oldest" | "newest" | "lowest" | "highest";
	  };

export class DuplicationGroup {
	private readonly [DuplicationGroupSymbol] = true;
	readonly policy: "ignore" | "replace";
	readonly maxStack: number;
	readonly selector: "lowest" | "highest";

	constructor(private readonly definition: DuplicationGroupDefinition) {
		this.policy = definition.policy;
		this.maxStack = definition.maxStack ?? 1;

		if (!definition.selector) this.selector = "lowest";
		else if (definition.selector === "oldest") this.selector = "lowest";
		else if (definition.selector === "newest") this.selector = "highest";
		else this.selector = definition.selector;
	}

	member<T>(options: Partial<DuplicationGroupMemberOptions<T>> = {}): DuplicationGroupMember<T> {
		const _options: DuplicationGroupMemberOptions<T> = {
			ranker: options.ranker ?? ((_, index) => index),
		};
		return new DuplicationGroupMemberInstance(this, _options);
	}
}

export function defineDuplicationGroup(definition: DuplicationGroupDefinition) {
	return new DuplicationGroup(definition);
}

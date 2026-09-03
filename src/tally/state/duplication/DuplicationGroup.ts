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

interface DuplicationGroupOptions<T> {
	rank(data: T, index: number): number;
}

export interface DuplicationGroupMember<T> {
	readonly group: DuplicationGroup<T>;
	rank(data: T, index: number): number;
}

export class DuplicationGroup<T> {
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

	member(options: Partial<DuplicationGroupOptions<T>> = {}): DuplicationGroupMember<T> {
		const _options: DuplicationGroupOptions<T> = {
			rank: options.rank ?? ((_, index) => index),
		};
		return {
			group: this,
			rank: _options.rank,
		};
	}
}

export function defineDuplicationGroup(definition: DuplicationGroupDefinition) {
	return new DuplicationGroup(definition);
}

import type { DuplicationGroup } from "./DuplicationGroup.js";

const DuplicationGroupMemberSymbol: unique symbol = Symbol("DuplicationGroupMemberSymbol");
export function isDuplicationGroupMember(o: object): o is DuplicationGroupMember<unknown> {
	return DuplicationGroupMemberSymbol in o;
}

export interface DuplicationGroupMemberOptions<T> {
	readonly ranker: (data: T, index: number) => number;
}

export interface DuplicationGroupMember<T> {
	readonly group: DuplicationGroup;
	rank(data: T, index: number): number;
}

export class DuplicationGroupMemberInstance<T> {
	private readonly [DuplicationGroupMemberSymbol] = true;

	constructor(
		public readonly group: DuplicationGroup,
		private readonly options: DuplicationGroupMemberOptions<T>
	) {}

	rank(data: T, index: number): number {
		return this.options.ranker(data, index);
	}
}

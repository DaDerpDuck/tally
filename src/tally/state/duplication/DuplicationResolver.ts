import type { Disconnect } from "../../util/Disconnect.js";
import type {
	AnyDuplicableType,
	DuplicableType,
	DuplicationCandidate,
} from "./DuplicationCandidate.js";
import { DuplicationIndex } from "./DuplicationIndex.js";

export type DuplicationDecision<TInstance extends DuplicationCandidate<TData>, TData> =
	| { readonly action: "add"; evict: readonly DuplicationCandidate[] }
	| { readonly action: "ignore" }
	| {
			readonly action: "reconcile";
			readonly target: TInstance;
			reconcile(existing: TInstance, incoming: TData): void;
	  };

export class DuplicationResolver {
	private order = 0;

	constructor(private readonly index: DuplicationIndex) {}

	decide<TInstance extends DuplicationCandidate<TData>, TData>(
		type: DuplicableType<TInstance, TData>,
		key?: unknown
	): DuplicationDecision<TInstance, TData> {
		const policy = type.duplication;
		if (policy.kind === "allow") return { action: "add", evict: [] };

		const domain = this.domainOf(type);
		const conflicts = this.index.get(domain, key);
		if (policy.kind === "ignore") {
			if (conflicts.length > 0) return { action: "ignore" };
			else return { action: "add", evict: [] };
		}

		if (policy.kind === "replace") {
			if (conflicts.length > 0) return { action: "add", evict: conflicts.map((entry) => entry.candidate) };
			return { action: "add", evict: [] };
		}

		if (policy.kind === "reconcile") {
			if (conflicts.length > 0)
				return {
					action: "reconcile",
					target: conflicts[0]!.candidate as TInstance,
					reconcile: policy.reconcile,
				};
			else return { action: "add", evict: [] };
		}

		if (policy.kind === "group") {
			if (policy.group.policy === "ignore") {
				if (conflicts.length >= policy.group.maxStack) return { action: "ignore" };
				else return { action: "add", evict: [] };
			}
			if (policy.group.policy === "replace") {
				if (policy.group.maxStack <= 0) return { action: "ignore" };
				if (conflicts.length < policy.group.maxStack) return { action: "add", evict: [] };

				const selector = policy.group.selector;
				let rank = conflicts[0]!.score();
				let order = conflicts[0]!.order;
				let selectedCandidate;

				for (let i = 0; i < conflicts.length; i++) {
					const conflict = conflicts[i]!;
					const cRank = conflict.score();

					if (selector === "lowest") {
						if (cRank < rank || (cRank === rank && conflict.order < order)) {
							rank = cRank;
							order = conflict.order;
							selectedCandidate = conflict;
						}
					} else {
						if (cRank > rank || (cRank === rank && conflict.order >= order)) {
							rank = cRank;
							order = conflict.order;
							selectedCandidate = conflict;
						}
					}
				}

				// TODO: Trim bucket size if needed, but I think we can run on the assumption that
				// buckets won't ever exceed max stack
				return { action: "add", evict: [selectedCandidate!.candidate] };
			}
		}

		throw new Error(`Invalid policy kind "${policy.kind}"`);
	}

	track<TInstance extends DuplicationCandidate<TData>, TData>(
		type: DuplicableType<TInstance, TData>,
		key: unknown,
		instance: TInstance
	): Disconnect {
		const order = this.order++;
		let score: () => number;
		if (type.duplication.kind === "group") {
			const rank = type.duplication.rank;
			score = () => rank(instance.get(), order);
		} else score = () => order;

		return this.index.add(this.domainOf(type), key, {
			candidate: instance,
			order: order,
			score,
		});
	}

	private domainOf(type: AnyDuplicableType): object {
		return type.duplication.kind === "group" ? type.duplication.group : type;
	}
}

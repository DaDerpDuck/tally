import type { Disconnect } from "../../util/Disconnect.js";
import type { ResolvedDuplicatePolicy } from "./DuplicatePolicy.js";
import type {
	AnyDuplicableType,
	DuplicableType,
	DuplicationCandidate,
} from "./DuplicationCandidate.js";
import { DuplicationIndex } from "./DuplicationIndex.js";

export type DuplicationDecision<TInstance extends DuplicationCandidate<TData>, TData> =
	| { action: "add"; evict: TInstance | undefined }
	| { action: "ignore" }
	| {
			action: "reconcile";
			target: TInstance;
			reconcile(existing: TInstance, incoming: TData): void;
	  };

export class DuplicationResolver {
	private order = 0;

	constructor(private readonly index: DuplicationIndex) {}

	decide<TInstance extends DuplicationCandidate<TData>, TData>(
		policy: ResolvedDuplicatePolicy<TInstance, TData>,
		domain: object,
		key?: unknown
	): DuplicationDecision<TInstance, TData> {
		if (policy.kind === "allow") return { action: "add", evict: undefined };

		const conflicts = this.index.get(domain, key);
		if (policy.kind === "ignore") {
			if (conflicts.length > 0) return { action: "ignore" };
			else return { action: "add", evict: undefined };
		}

		if (policy.kind === "replace") {
			if (conflicts.length > 0)
				return { action: "add", evict: conflicts[0]!.candidate as TInstance };
			return { action: "add", evict: undefined };
		}

		if (policy.kind === "reconcile") {
			if (conflicts.length > 0)
				return {
					action: "reconcile",
					target: conflicts[0]!.candidate as TInstance,
					reconcile: policy.reconcile,
				};
			else return { action: "add", evict: undefined };
		}

		if (policy.kind === "group") {
			if (policy.group.policy === "ignore") {
				if (conflicts.length >= policy.group.maxStack) return { action: "ignore" };
				else return { action: "add", evict: undefined };
			}
			if (policy.group.policy === "replace") {
				if (conflicts.length < policy.group.maxStack)
					return { action: "add", evict: undefined };

				const selector = policy.group.selector;
				let rank =
					selector === "lowest" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
				let selectedCandidate;

				for (let i = 0; i < conflicts.length; i++) {
					const conflict = conflicts[i]!;
					const cRank = conflict.score();

					if (
						(selector === "lowest" && cRank < rank) ||
						(selector === "highest" && cRank >= rank)
					) {
						rank = cRank;
						selectedCandidate = conflict;
					}
				}

				return { action: "add", evict: selectedCandidate!.candidate as TInstance };
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

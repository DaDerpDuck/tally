import { getOrInsert } from "../../util/GetOrInsert.js";
import type { DuplicatePolicy } from "./DuplicatePolicy.js";
import type { DuplicationCandidate } from "./DuplicationCandidate.js";

const UnspecifiedKey = Symbol("UnspecifiedKey");

export type DuplicationDecision<T extends DuplicationCandidate> =
	| { action: "add"; evict: T | undefined }
	| { action: "ignore" }
	| { action: "reconcile"; target: T };

export class DuplicationIndex {
	private readonly duplicationMap = new Map<object, Map<unknown, DuplicationCandidate[]>>();

	add(domain: object, candidate: DuplicationCandidate) {
		const keyBucket = getOrInsert(
			this.duplicationMap,
			domain,
			new Map<unknown, DuplicationCandidate[]>()
		);
		getOrInsert(keyBucket, candidate.key ?? UnspecifiedKey, []).push(candidate);
	}

	delete(domain: object, candidate: DuplicationCandidate) {
		const keyBucket = this.duplicationMap.get(domain);
		if (keyBucket === undefined) return;
		const candidates = keyBucket.get(candidate.key ?? UnspecifiedKey);
		if (candidates === undefined) return;
		const index = candidates.findIndex((v) => v === candidate);
		if (index === -1) return;
		candidates.splice(index, 1);
	}

	getConflicts(domain: object, key?: unknown): readonly DuplicationCandidate[] {
		return this.duplicationMap.get(domain)?.get(key ?? UnspecifiedKey) ?? [];
	}

	decide<T extends DuplicationCandidate>(
		policy: DuplicatePolicy<T, unknown>,
		domain: object,
		key?: unknown
	): DuplicationDecision<T> {
		if (policy.kind === "group") {
			const conflicts = this.getConflicts(domain, key);
			if (policy.policy.group.policy === "ignore") {
				if (conflicts.length >= policy.policy.group.maxStack) return { action: "ignore" };
				else return { action: "add", evict: undefined };
			}
			if (policy.policy.group.policy === "replace") {
				if (conflicts.length < policy.policy.group.maxStack)
					return { action: "add", evict: undefined };

				const selector = policy.policy.group.selector;
				let rank =
					selector === "lowest" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
				let selectedCandidate;

				for (let i = 0; i < conflicts.length; i++) {
					const conflict = conflicts[i]!;
					const cRank = policy.policy.rank(conflict.get(), i);

					if (
						(selector === "lowest" && cRank < rank) ||
						(selector === "highest" && cRank >= rank)
					) {
						rank = cRank;
						selectedCandidate = conflict;
					}
				}

				return { action: "add", evict: selectedCandidate as T };
			}
		} else {
			if (policy.policy.action === "allow") return { action: "add", evict: undefined };

			const conflicts = this.getConflicts(domain, key);
			if (policy.policy.action === "ignore") {
				if (conflicts.length > 0) return { action: "ignore" };
				else return { action: "add", evict: undefined };
			}
			if (policy.policy.action === "replace") {
				if (conflicts.length > 0) return { action: "add", evict: conflicts[0] as T };
				return { action: "add", evict: undefined };
			}
			if (policy.policy.action === "reconcile") {
				if (conflicts.length > 0) return { action: "reconcile", target: conflicts[0] as T };
				else return { action: "add", evict: undefined };
			}
		}

		throw new Error("Unspecified policy action");
	}
}

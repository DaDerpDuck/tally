import type { Disconnect } from "../../util/Disconnect.js";
import { getOrInsertComputed } from "../../util/GetOrInsert.js";
import type { DuplicationCandidate } from "./DuplicationCandidate.js";

export interface DuplicationEntry {
	readonly candidate: DuplicationCandidate;
	readonly order: number;
	readonly score: () => number;
	readonly replaceIf: (existingRank: number, incomingRank: number) => boolean;
}

export class DuplicationIndex {
	private static readonly EmptyArray = new Array<DuplicationEntry>(0);

	private readonly duplicationStruct = {
		unkeyed: new Map<object, DuplicationEntry[]>(),
		keyed: new Map<object, Map<string, DuplicationEntry[]>>(),
	} as const;

	get(domain: object, key: string | undefined): readonly DuplicationEntry[] {
		if (key === undefined) {
			return this.duplicationStruct.unkeyed.get(domain) ?? DuplicationIndex.EmptyArray;
		} else {
			return (
				this.duplicationStruct.keyed.get(domain)?.get(key) ?? DuplicationIndex.EmptyArray
			);
		}
	}

	add(domain: object, key: string | undefined, entry: DuplicationEntry): Disconnect {
		if (key === undefined) {
			const entries = getOrInsertComputed(this.duplicationStruct.unkeyed, domain, () => []);
			entries.push(entry);

			return () => {
				const index = entries.findIndex((e) => e === entry);
				if (index < 0) return;
				if (entries.length === 1) return this.duplicationStruct.unkeyed.delete(domain);
				entries[index] = entries[entries.length - 1]!;
				entries.pop();
				if (entries.length === 0) this.duplicationStruct.unkeyed.delete(domain);
			};
		} else {
			const keyBucket = getOrInsertComputed(
				this.duplicationStruct.keyed,
				domain,
				() => new Map<string, DuplicationEntry[]>()
			);
			const entries = getOrInsertComputed(keyBucket, key, () => []);
			entries.push(entry);

			return () => {
				const index = entries.findIndex((e) => e === entry);
				if (index < 0) return;
				entries[index] = entries[entries.length - 1]!;
				entries.pop();
				if (entries.length === 0) keyBucket.delete(key);
				if (keyBucket.size === 0) this.duplicationStruct.keyed.delete(domain);
			};
		}
	}
}

import type { DuplicatePolicy } from "./DuplicatePolicy.js";

export interface DuplicationCandidate {
	readonly duplication: DuplicatePolicy<unknown, unknown>;
	readonly key?: unknown;

	get(): unknown;
}

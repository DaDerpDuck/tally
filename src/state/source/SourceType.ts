import type { Registrable, TallyContext } from "../core/TallyContext.js";
import type { Source } from "./Source.js";
import type { SourceContribution } from "./SourceContribution.js";

type DuplicatePolicy = "allow" | "ignore" | "replace" | "reconcile";

export interface SourceTypeDefinition<TData> {
	readonly name: string;
	readonly duplicatePolicy: DuplicatePolicy;

	create(data: TData): SourceContribution;

	reconcile?(existing: Source<TData>, incoming: TData): void;
}

export class SourceType<TData> implements Registrable {
	constructor(public readonly definition: SourceTypeDefinition<TData>) {}

	register(tally: TallyContext<unknown>): void {
		if (
			tally.sources.has(this.definition.name) &&
			tally.sources.get(this.definition.name) !== this
		)
			throw new Error("Duplicate source name");
		tally.sources.set(this.definition.name, this);
	}
}

export function defineSourceType<TData>(definition: SourceTypeDefinition<TData>) {
	if (definition.duplicatePolicy === "reconcile" && definition.reconcile === undefined)
		throw new Error("Reconcile policy was specified but no reconcile callback was given");
	return new SourceType(definition);
}

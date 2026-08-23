import type { Registrable, TallyContext } from "../core/TallyContext.js";
import type { Source } from "./Source.js";
import type { SourceContribution } from "./SourceContribution.js";

type DuplicatePolicy = "allow" | "ignore" | "replace" | "reconcile";

export interface ReplicationDefinition<TData> {
	readonly scope?: string;

	serialize(data: TData): string;
	deserialize(serialized: string): TData;
}

export interface SourceTypeDefinition<TData> {
	readonly name: string;
	readonly duplicatePolicy: DuplicatePolicy;

	contribute(data: TData): SourceContribution;

	readonly replication?: ReplicationDefinition<TData>;
	reconcile?(existing: Source<TData>, incoming: TData): void;
}

export interface SourceTypeBase {
	readonly name: string;
	readonly duplicatePolicy: DuplicatePolicy;
}

export class SourceType<TData> implements SourceTypeBase, Registrable {
	public readonly name: string;
	public readonly duplicatePolicy: DuplicatePolicy;

	constructor(public readonly definition: SourceTypeDefinition<TData>) {
		this.name = definition.name;
		this.duplicatePolicy = definition.duplicatePolicy
	}

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

import type { Registrable, Registry } from "../core/Registrable.js";
import type { Source } from "./Source.js";
import type { SourceContribution } from "./SourceContribution.js";

export interface ReplicationDefinition<TData> {
	readonly scope?: string;

	serialize(data: TData): string;
	deserialize(serialized: string): TData;
}

export type Duplication<TData> =
	| {
			readonly policy: "allow" | "ignore" | "replace";
			readonly reconcile?: never;
	  }
	| {
			readonly policy: "reconcile";
			reconcile(existing: Source<TData>, incoming: TData): void;
	  };

export interface SourceTypeDefinition<TData> {
	readonly name: string;
	readonly duplication?: Duplication<TData>;

	contribute(data: TData): SourceContribution;

	readonly replication?: ReplicationDefinition<TData>;
}

export interface SourceTypeBase {
	readonly name: string;
}

export class SourceType<TData> implements SourceTypeBase, Registrable {
	public readonly name: string;
	public readonly duplication: Duplication<TData>;
	public readonly replication: ReplicationDefinition<TData> | undefined;

	constructor(private readonly definition: SourceTypeDefinition<TData>) {
		this.name = definition.name;
		this.duplication = definition.duplication ?? { policy: "allow" };
		this.replication = definition.replication;
	}

	contribute(data: TData): SourceContribution {
		return this.definition.contribute(data);
	}

	register(registry: Registry): void {
		if (
			registry.sources.has(this.definition.name) &&
			registry.sources.get(this.definition.name) !== this
		)
			throw new Error(`Duplicate source name: ${this.definition.name}`);
		registry.sources.set(this.definition.name, this);
	}
}

export function defineSourceType<TData>(definition: SourceTypeDefinition<TData>) {
	return new SourceType(definition);
}

import type {
	AnyReplicationDefinition,
	ReplicationDefinition,
} from "../../replication/ReplicationDefinition.js";
import type { Registrable, Registry } from "../Registrable.js";
import type { Source } from "./Source.js";
import type { SourceContribution } from "./SourceContribution.js";

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
	readonly priority: number;
	readonly duplication?: Duplication<TData>;

	contribute(data: TData): SourceContribution;

	readonly replication?: ReplicationDefinition<TData>;
}

export interface AnySourceType {
	readonly name: string;
	readonly replication?: AnyReplicationDefinition | undefined;
}

export class SourceType<TData> implements AnySourceType, Registrable {
	public readonly name: string;
	public readonly priority: number;
	public readonly duplication: Duplication<TData>;
	public readonly replication?: ReplicationDefinition<TData> | undefined;

	constructor(private readonly definition: SourceTypeDefinition<TData>) {
		this.name = definition.name;
		this.priority = definition.priority;
		this.duplication = definition.duplication ?? { policy: "allow" };
		this.replication = definition.replication;
	}

	contribute(data: TData): SourceContribution {
		return this.definition.contribute(data);
	}

	register(registry: Registry): void {
		if (registry.sources.has(this.name) && registry.sources.get(this.name) !== this)
			throw new Error(`Duplicate source name: ${this.name}`);
		registry.sources.set(this.name, this);
	}
}

export function defineSourceType<TData>(definition: SourceTypeDefinition<TData>) {
	return new SourceType(definition);
}

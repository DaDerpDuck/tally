import type { Registrable, Registry } from "../core/Registrable.js";
import type {
	AnyReplicationDefinition,
	ReplicationDefinition,
} from "../replication/ReplicationDefinition.js";
import type { Source } from "../source/Source.js";

export interface AnyDescriptorType {
	readonly name: string;
	readonly replication: AnyReplicationDefinition;
}

export interface DescriptorTypeDefinition<TDescriptorData, TSource extends Source> {
	readonly name: string;
	readonly source: TSource;
	readonly replication: ReplicationDefinition<TDescriptorData>;
}

export class DescriptorType<TDescriptorData, TSource extends Source>
	implements AnyDescriptorType, Registrable
{
	public readonly name: string;
	public readonly source: TSource;
	public readonly replication: ReplicationDefinition<TDescriptorData>;

	constructor(private readonly definition: DescriptorTypeDefinition<TDescriptorData, TSource>) {
		this.name = definition.name;
		this.source = definition.source;
		this.replication = definition.replication;
	}

	register(registry: Registry): void {
		if (registry.descriptors.has(this.name) && registry.descriptors.get(this.name) !== this)
			throw new Error(`Duplicate source name: ${this.name}`);
		registry.descriptors.set(this.name, this);
	}
}

export type ExtractDataFromDescriptor<T extends DescriptorType<unknown, Source>> =
	T extends DescriptorType<infer U, Source> ? U : never;
export type ExtractSourceFromDescriptor<T extends DescriptorType<unknown, Source>> =
	T extends DescriptorType<unknown, infer U> ? U : never;

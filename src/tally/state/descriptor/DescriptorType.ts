import type {
	AnyReplicationDefinition,
	ReplicationDefinition,
} from "../../replication/ReplicationDefinition.js";
import type { Duplication } from "../DuplicatePolicy.js";
import type { Registrable, Registry } from "../Registrable.js";
import type { SourceType } from "../source/SourceType.js";
import type { StateTypeDefinition } from "../StateTypeDefinition.js";
import type { Descriptor } from "./Descriptor.js";

export interface AnyDescriptorType {
	readonly name: string;
	readonly replication: AnyReplicationDefinition;
}

export interface DescriptorTypeDefinition<
	TDescriptorData,
	TSourceData,
> extends StateTypeDefinition {
	readonly duplication?: Duplication<Descriptor<TDescriptorData, TSourceData>, TDescriptorData>;
	readonly source: SourceType<TSourceData>;
	readonly replication: ReplicationDefinition<TDescriptorData>;
}

export class DescriptorType<TDescriptorData, TSourceData>
	implements AnyDescriptorType, Registrable
{
	public readonly name: string;
	public readonly source: SourceType<TSourceData>;
	public readonly replication: ReplicationDefinition<TDescriptorData>;

	constructor(
		private readonly definition: DescriptorTypeDefinition<TDescriptorData, TSourceData>
	) {
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

export function defineDescriptorType<TDescriptorData, TSourceData>(
	definition: DescriptorTypeDefinition<TDescriptorData, TSourceData>
) {
	return new DescriptorType(definition);
}

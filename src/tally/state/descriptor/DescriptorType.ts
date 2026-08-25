import type {
	AnyReplicationDefinition,
	ReplicationDefinition,
} from "../../replication/ReplicationDefinition.js";
import type { DuplicatePolicy } from "../DuplicatePolicy.js";
import type { Registrable, Registry } from "../Registrable.js";
import type { SourceType } from "../source/SourceType.js";
import type { StateTypeDefinition } from "../StateTypeDefinition.js";
import type { AnyDescriptor, Descriptor } from "./Descriptor.js";

export interface DescriptorTypeDefinition<
	TDescriptorData,
	TSourceData,
> extends StateTypeDefinition {
	readonly duplication?: DuplicatePolicy<Descriptor<TDescriptorData, TSourceData>, TDescriptorData>;
	readonly source: SourceType<TSourceData>;
	readonly replication: ReplicationDefinition<TDescriptorData>;
}

export interface AnyDescriptorType {
	readonly name: string;
	readonly duplication: DuplicatePolicy<AnyDescriptor, unknown>;
	readonly replication: AnyReplicationDefinition;
}

export class DescriptorType<TDescriptorData, TSourceData>
	implements AnyDescriptorType, Registrable
{
	public readonly name: string;
	public readonly duplication: DuplicatePolicy<
		Descriptor<TDescriptorData, TSourceData>,
		TDescriptorData
	>;
	public readonly replication: ReplicationDefinition<TDescriptorData>;
	public readonly source: SourceType<TSourceData>;

	constructor(
		private readonly definition: DescriptorTypeDefinition<TDescriptorData, TSourceData>
	) {
		this.name = definition.name;
		this.duplication = definition.duplication ?? { policy: "allow" };
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

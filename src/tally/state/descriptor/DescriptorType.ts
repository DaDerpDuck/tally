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
> extends StateTypeDefinition<TDescriptorData> {
	/**
	 * Specifies the behavior when a Descriptor is added to an AgentState with an
	 * existing same type.
	 *
	 * Defaults to "allow" behavior.
	 *
	 * @see {@link DuplicatePolicy}
	 */
	readonly duplication?: DuplicatePolicy<
		Descriptor<TDescriptorData, TSourceData>,
		TDescriptorData
	>;
	/**
	 * The SourceType that this Descriptor will be creating.
	 */
	readonly source: SourceType<TSourceData>;
	/**
	 * Enables replication and specifies serde logic.
	 */
	readonly replication?: ReplicationDefinition<TDescriptorData> | undefined;
}

export interface AnyDescriptorType {
	readonly name: string;
	readonly duplication: DuplicatePolicy<AnyDescriptor, unknown>;
	readonly replication?: AnyReplicationDefinition | undefined;
	dataEquals(a: unknown, b: unknown): boolean;
}

export class DescriptorType<TDescriptorData, TSourceData>
	implements AnyDescriptorType, Registrable
{
	public readonly name: string;
	public readonly duplication: DuplicatePolicy<
		Descriptor<TDescriptorData, TSourceData>,
		TDescriptorData
	>;
	public readonly replication?: ReplicationDefinition<TDescriptorData> | undefined;
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
			throw new Error(`Duplicate descriptor name: ${this.name}`);
		registry.descriptors.set(this.name, this);
	}

	dataEquals(a: TDescriptorData, b: TDescriptorData): boolean {
		return this.definition.dataEquals?.(a, b) ?? Object.is(a, b);
	}
}

/**
 * Defines the data structure and the SourceType this Descriptor creates.
 *
 * DescriptorTypes are immutable definitions.
 *
 * Before a Descriptor can be created, a handler must be registered first using
 * `TallyContext.registerDescriptorHandler` or `AgentState.registerDescriptorHandler`.
 */
export function defineDescriptorType<TDescriptorData, TSourceData>(
	definition: DescriptorTypeDefinition<TDescriptorData, TSourceData>
) {
	return new DescriptorType(definition);
}

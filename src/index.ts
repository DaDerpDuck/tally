// Core
export { AgentState } from "./tally/core/AgentState.js";
export { TallyContext } from "./tally/core/TallyContext.js";

// Modifiers / custom Property extension
export type { Modifier, AnyModifier } from "./tally/modifier/Modifier.js";
export type { ModifierCollection } from "./tally/modifier/ModifierCollection.js";
export {
	type ModifierContribution,
	contributeModifier,
} from "./tally/modifier/ModifierContribution.js";

// Property
export type { Property, AnyProperty } from "./tally/property/Property.js";
export { BaseProperty, type PropertyDefinition } from "./tally/property/BaseProperty.js";
export { BooleanProperty, defineBooleanProperty } from "./tally/property/BooleanProperty.js";
export { NumberProperty, defineNumberProperty } from "./tally/property/NumberProperty.js";

// State behavior
export type { DuplicatePolicy } from "./tally/state/DuplicatePolicy.js";
export type { StateProvenance, ProvenanceDomain } from "./tally/state/Provenance.js";

// Source
export type { Source } from "./tally/state/source/Source.js";
export {
	SourceType,
	type AnySourceType,
	defineSourceType,
	type SourceTypeDefinition,
} from "./tally/state/source/SourceType.js";
export type { SourceOption } from "./tally/state/source/SourceOption.js";
export type { SourceContribution } from "./tally/state/source/SourceContribution.js";

// Descriptor
export type { Descriptor, AnyDescriptor } from "./tally/state/descriptor/Descriptor.js";
export {
	DescriptorType,
	type AnyDescriptorType,
	defineDescriptorType,
	type DescriptorTypeDefinition,
} from "./tally/state/descriptor/DescriptorType.js";
export type {
	DescriptorHandler,
	DescriptorHandlerContext,
} from "./tally/state/descriptor/DescriptorHandler.js";
export type { DescriptorBinding } from "./tally/state/descriptor/DescriptorBinding.js";
export type { DescriptorOption } from "./tally/state/descriptor/DescriptorOption.js";

// Replication
export type { ReplicationValue } from "./tally/replication/ReplicationValue.js";
export type { ReplicationDefinition } from "./tally/replication/ReplicationDefinition.js";
export {
	type ReplicationSnapshot,
	createReplicationSnapshot,
} from "./tally/replication/ReplicationSnapshot.js";
export type { ReplicationReceiver } from "./tally/replication/ReplicationReceiver.js";

export {
	type ReplicatedSource,
	type SourceId,
	serializeSource,
} from "./tally/replication/source/ReplicatedSource.js";
export { SourceReceiver } from "./tally/replication/source/SourceReceiver.js";
export type { SourceReplicationEvent } from "./tally/replication/source/SourceReplicationEvent.js";

export {
	type ReplicatedDescriptor,
	type DescriptorId,
	serializeDescriptor,
} from "./tally/replication/descriptor/ReplicatedDescriptor.js";
export { DescriptorReceiver } from "./tally/replication/descriptor/DescriptorReceiver.js";
export type { DescriptorReplicationEvent } from "./tally/replication/descriptor/DescriptorReplicationEvent.js";

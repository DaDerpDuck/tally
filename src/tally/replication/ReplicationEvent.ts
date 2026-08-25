import type { DescriptorReplicationEvent } from "./descriptor/DescriptorReplicationEvent.js";
import type { SourceReplicationEvent } from "./source/SourceReplicationEvent.js";

export type ReplicationEvent =
	| { target: "source"; event: SourceReplicationEvent }
	| { target: "descriptor"; event: DescriptorReplicationEvent };

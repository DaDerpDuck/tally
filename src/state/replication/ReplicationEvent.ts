import type { DescriptorReplicationEvent } from "../descriptor/DescriptorReplicationEvent.js";
import type { SourceReplicationEvent } from "./SourceReplicationEvent.js";

export type ReplicationEvent =
	| { target: "source"; event: SourceReplicationEvent }
	| { target: "descriptor"; event: DescriptorReplicationEvent };

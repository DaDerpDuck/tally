import type { ReplicatedSource, SourceId } from "./ReplicatedSource.js";
import type { ReplicationValue } from "../ReplicationValue.js";

export type SourceReplicationEvent =
	| { readonly kind: "added"; readonly source: ReplicatedSource }
	| { readonly kind: "updated"; readonly id: SourceId; readonly data: ReplicationValue }
	| { readonly kind: "removed"; readonly id: SourceId };

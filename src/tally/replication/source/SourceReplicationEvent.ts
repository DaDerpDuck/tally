import type { ReplicationValue } from "../ReplicationValue.js";
import type { ReplicatedSource, SourceId } from "./ReplicatedSource.js";

export type SourceReplicationEvent =
	| { readonly kind: "added"; readonly source: ReplicatedSource }
	| { readonly kind: "updated"; readonly id: SourceId; readonly data: ReplicationValue }
	| { readonly kind: "removed"; readonly id: SourceId };

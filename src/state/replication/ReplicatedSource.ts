import type { ReplicationValue } from "./ReplicationValue.js";

export type SourceId = number;

export interface ReplicatedSource {
    readonly id: SourceId;
    readonly type: string;
    readonly priority: number;
    readonly data: ReplicationValue;
}
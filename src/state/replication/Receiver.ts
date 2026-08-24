import type { ReplicationEvent } from "./ReplicationEvent.js";
import type { ReplicationSnapshot } from "./ReplicationSnapshot.js";

export interface Receiver {
	apply(events: readonly ReplicationEvent[]): void;
	applySnapshot(snapshot: ReplicationSnapshot): void;
}

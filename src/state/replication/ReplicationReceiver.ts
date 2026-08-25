import type { ReplicationEvent } from "./ReplicationEvent.js";
import type { ReplicationSnapshot } from "./ReplicationSnapshot.js";

export interface ReplicationReceiver {
	apply(events: readonly ReplicationEvent[]): void;
	applySnapshot(snapshot: ReplicationSnapshot): void;
}

import type { ReplicationEvent } from "./ReplicationEvent.js";
import type { ReplicationSnapshot } from "./ReplicationSnapshot.js";

/**
 * Applies replicated state to an AgentState. Receivers track which local runtime
 * object correspond to remote IDs, deserialize incoming data using the registered
 * type definitions, and create, update, or destroy local state as replication
 * events arrive.
 */
export interface ReplicationReceiver {
	/**
	 * Processes incremental changes. Receivers filter mixed events for their
	 * own target, so the same event batch can be handed to any receiver.
	 *
	 * As an optimization, the whole event batch is applied within `AgentState.batch`,
	 * so property resolution is deferred until the batch is finished.
	 */
	apply(events: readonly ReplicationEvent[]): void;
	/**
	 * Reconciles the current receiver state with the given snapshot. Local Sources
	 * are added, updated, and destroyed as needed to match the given snapshot.
	 *
	 * As an optimization, the reconciliation is applied within `AgentState.batch`,
	 * so property resolution is deferred until the batch is finished.
	 */
	applySnapshot(snapshot: ReplicationSnapshot): void;
}

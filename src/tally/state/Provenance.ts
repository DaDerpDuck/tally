export type ProvenanceDomain =
	"local" | "replicated" | "descriptor-local" | "descriptor-replicated";

/**
 * An internal object that determines whether added states will
 * replicate and deconflicts the execution order of those states.
 *
 * Exposed for advanced users seeking to control ordering of states.
 */
export interface StateProvenance {
	readonly domain: ProvenanceDomain;
	readonly sequence: number;
}

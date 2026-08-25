export type ProvenanceDomain =
	"local" | "replicated" | "descriptor-local" | "descriptor-replicated";

export interface StateProvenance {
	readonly domain: ProvenanceDomain;
	readonly sequence: number;
}

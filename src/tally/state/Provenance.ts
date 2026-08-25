export type ProvenanceDomain = "local" | "replicated" | "descriptor";

export interface StateProvenance {
	readonly domain: ProvenanceDomain;
	readonly sequence: number;
}

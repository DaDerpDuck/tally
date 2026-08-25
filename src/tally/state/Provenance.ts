export type ProvenanceDomain = "local" | "replicated" | "descriptor";

export interface StateProvenance {
	readonly domain: ProvenanceDomain;
	readonly order: number;
}

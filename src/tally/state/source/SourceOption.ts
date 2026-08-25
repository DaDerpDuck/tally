export type SourceDomain = "local" | "replicated" | "descriptor"

export interface SourceProvenance {
    readonly domain: SourceDomain;
    readonly order: number;
}

export interface SourceOption {
	readonly priority?: number;
    readonly provenance?: SourceProvenance;
}

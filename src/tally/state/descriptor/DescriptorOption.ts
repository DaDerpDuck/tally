import type { StateProvenance } from "../Provenance.js";

export interface DescriptorOption {
	readonly priority?: number;
	readonly provenance?: StateProvenance;
}

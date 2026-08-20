import type { ModifierContribution } from "../modifier/ModifierContribution.js";

export interface SourceContribution {
	readonly modifiers: readonly ModifierContribution[];
}

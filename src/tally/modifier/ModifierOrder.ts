import type { OrderingDomain } from "./OrderingDomain.js";

/**
 * Defines deterministic Modifier resolution order. Lower numbers are resolved
 * before higher numbers.
 *
 * Modifiers are ordered by:
 * 1. priority
 * 2. ordering domain
 * 3. sequence
 * 4. modifier index
 */
export interface ModifierOrder {
	readonly priority: number;
	readonly domain: OrderingDomain;
	readonly sequence: number;
	readonly modifierIndex: number;
}

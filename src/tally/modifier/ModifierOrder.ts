import type { OrderingDomain } from "./OrderingDomain.js";

export interface ModifierOrder {
	readonly priority: number;
	readonly domain: OrderingDomain;
	readonly sequence: number;
	readonly modifierIndex: number;
}

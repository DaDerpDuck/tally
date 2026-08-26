export interface StateTypeDefinition<TData> {
	readonly name: string;
	/**
	 * Determines whether two supplied data are considered equivalent.
	 *
	 * Used to decide whether change callbacks should fire.
	 */
	equals?(a: TData, b: TData): boolean;
}

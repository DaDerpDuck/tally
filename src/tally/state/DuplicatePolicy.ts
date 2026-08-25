export type DuplicatePolicy<TExisting, TData> =
	| {
			readonly policy: "allow" | "ignore" | "replace";
	  }
	| {
			readonly policy: "reconcile";
			reconcile(existing: TExisting, incoming: TData): void;
	  };

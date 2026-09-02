import type { DuplicatePolicyOption } from "./DuplicatePolicyOption.js";
import { isDuplicationGroupMember, type DuplicationGroupMember } from "./DuplicationGroupMember.js";

export type DuplicatePolicy<TExisting, TData> =
	GroupDuplicatePolicy<TData> | LocalDuplicatePolicy<TExisting, TData>;

export type GroupDuplicatePolicy<TData> = {
	readonly kind: "group";
	readonly policy: DuplicationGroupMember<TData>;
};

export type LocalDuplicatePolicy<TExisting, TData> = {
	readonly kind: "local";
	readonly policy:
		| {
				readonly action: "allow" | "ignore" | "replace";
		  }
		| {
				readonly action: "reconcile";
				reconcile(existing: TExisting, incoming: TData): void;
		  };
};

export function createDuplicatePolicy<TExisting, TData>(
	option: DuplicatePolicyOption<TExisting, TData>
): DuplicatePolicy<TExisting, TData> {
	if (isDuplicationGroupMember(option)) {
		return {
			kind: "group",
			policy: option,
		};
	} else if ("policy" in option) {
		if (option.policy === "reconcile")
			return {
				kind: "local",
				policy: {
					action: option.policy,
					reconcile: option.reconcile,
				},
			};
		else
			return {
				kind: "local",
				policy: { action: option.policy },
			};
	}
	throw new Error("Failed to create duplicate policy due to invalid option");
}

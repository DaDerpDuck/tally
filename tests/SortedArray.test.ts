import { describe, expect, it } from "vitest";
import { SortedArray } from "../src/tally/util/SortedArray";

function expectContents(array: SortedArray<number, number>, values: number[]) {
	expect(array.values()).toEqual(values);
	expect(array.size()).toBe(values.length);
}

describe("sorted array", () => {
	it.each([
		{
			name: "different priorities",
			entries: [
				[1, 10],
				[3, 30],
				[2, 20],
			] as const,
		},
		{
			name: "the same priority",
			entries: [
				[1, 10],
				[2, 10],
				[3, 10],
			] as const,
		},
		{
			name: "mixed priorities",
			entries: [
				[4, 30],
				[3, 20],
				[5, 30],
				[1, 10],
				[2, 10],
			] as const,
		},
	])("orders values inserted at $name", ({ entries }) => {
		const array = new SortedArray<number, number>((a, b) => a - b);

		for (const [value, priority] of entries) array.insert(value, priority);

		expectContents(
			array,
			entries
				.toSorted(([, aPriority], [, bPriority]) => aPriority - bPriority)
				.map(([value]) => value)
		);
	});
});

import { describe, expect, it } from "vitest";
import { OrderedBuckets } from "../src";

function expectContents(buckets: OrderedBuckets<number>, values: number[]) {
	expect(buckets.values()).toEqual(values);
	expect(buckets.size()).toBe(values.length);
}

describe("ordered buckets", () => {
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
		const buckets = new OrderedBuckets<number>();

		for (const [value, priority] of entries) buckets.insert(value, priority);

		expectContents(
			buckets,
			entries
				.toSorted(([, aPriority], [, bPriority]) => aPriority - bPriority)
				.map(([value]) => value)
		);
	});

	it.each([
		["different buckets", 10, 20],
		["the same bucket", 10, 10],
	] as const)(
		"updates entry indexes after deleting from %s",
		(_, firstPriority, secondPriority) => {
			const buckets = new OrderedBuckets<number>();
			const first = buckets.insert(1, firstPriority);
			const second = buckets.insert(2, secondPriority);

			expect(buckets.delete(first)).toBe(true);
			expect(first).toEqual({
				value: 1,
				priority: firstPriority,
				bucketIndex: -1,
			});
			expect(second).toEqual({
				value: 2,
				priority: secondPriority,
				bucketIndex: 0,
			});
			expectContents(buckets, [2]);
		}
	);
});

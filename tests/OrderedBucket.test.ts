import { describe, it, expect } from "vitest";
import { OrderedBuckets } from "../src";

describe("ordered buckets", () => {
	it("inserts at different priorities", () => {
		const buckets = new OrderedBuckets<number>();
		buckets.insert(1, 10);
		buckets.insert(3, 30);
		buckets.insert(2, 20);
		expect(buckets.values()).toEqual([1, 2, 3]);
		expect(buckets.size()).toBe(3);
	});

	it("inserts at same priority", () => {
		const buckets = new OrderedBuckets<number>();
		buckets.insert(1, 10);
		buckets.insert(2, 10);
		buckets.insert(3, 10);
		expect(buckets.values()).toEqual([1, 2, 3]);
		expect(buckets.size()).toBe(3);
	});

	it("inserts at mixed priorities", () => {
		const buckets = new OrderedBuckets<number>();
		buckets.insert(4, 30);
		buckets.insert(3, 20);
		buckets.insert(5, 30);
		buckets.insert(1, 10);
		buckets.insert(2, 10);
		expect(buckets.values()).toEqual([1, 2, 3, 4, 5]);
		expect(buckets.size()).toBe(5);
	});

	it("deletes at different bucket", () => {
		const buckets = new OrderedBuckets<number>();
		const entry1 = buckets.insert(1, 10);
		const entry2 = buckets.insert(2, 20);
		expect(buckets.delete(entry1)).toBe(true);
		expect(entry1).toEqual({
			value: 1,
			priority: 10,
			bucketIndex: -1,
		});
		expect(entry2).toEqual({
			value: 2,
			priority: 20,
			bucketIndex: 0,
		});
		expect(buckets.values()).toEqual([2]);
		expect(buckets.size()).toBe(1);
	});

	it("deletes at same bucket", () => {
		const buckets = new OrderedBuckets<number>();
		const entry1 = buckets.insert(1, 10);
		const entry2 = buckets.insert(2, 10);
		expect(buckets.delete(entry1)).toBe(true);
		expect(entry1).toEqual({
			value: 1,
			priority: 10,
			bucketIndex: -1,
		});
		expect(entry2).toEqual({
			value: 2,
			priority: 10,
			bucketIndex: 0,
		});
		expect(buckets.values()).toEqual([2]);
		expect(buckets.size()).toBe(1);
	});
});

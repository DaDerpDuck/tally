interface Entry<T> {
	value: T;
	readonly priority: number;
	readonly bucketIndex: number;
}

interface MutableEntry<T> {
	value: T;
	priority: number;
	bucketIndex: number;
}

export class OrderedBuckets<T> {
	private sortedPriorities = new Array<number>();
	private bucketMap = new Map<number, MutableEntry<T>[]>();
	private length = 0;

	insert(value: T, priority: number): Entry<T> {
		this.length++;
		const bucket = this.bucketMap.get(priority);

		if (bucket) {
			const entry: MutableEntry<T> = {
				value,
				priority,
				bucketIndex: bucket.length,
			};
			bucket.push(entry);
			return entry;
		} else {
			let i = 0;
			let j = this.sortedPriorities.length - 1;
			while (i <= j) {
				const mid = i + (((j - i) * 0.5) | 0);
				if (priority > this.sortedPriorities[mid]!) {
					i = mid + 1;
				} else {
					j = mid - 1;
				}
			}
			this.sortedPriorities.splice(i, 0, priority);

			const entry: MutableEntry<T> = {
				value,
				priority,
				bucketIndex: 0,
			};
			this.bucketMap.set(priority, [entry]);
			return entry;
		}
	}

	delete(entry: Entry<T>): boolean {
		const priority = entry.priority;
		const bucket = this.bucketMap.get(priority);
		if (!bucket) return false;
		if (bucket[entry.bucketIndex] !== entry) return false;
		bucket.splice(entry.bucketIndex, 1);
		for (let i = entry.bucketIndex; i < bucket.length; i++) {
			bucket[i]!.bucketIndex--;
		}
		this.length--;
		(entry as MutableEntry<T>).bucketIndex = -1;
		return true;
	}

	values(): T[] {
		const array = new Array<T>(this.length);
		let idx = 0;
		for (const entry of this.iterateAscending()) {
			array[idx++] = entry.value;
		}
		return array;
	}

	*iterateAscending(): Generator<Entry<T>> {
		for (let i = 0; i < this.sortedPriorities.length; i++) {
			const bucket = this.bucketMap.get(this.sortedPriorities[i]!)!;
			for (let j = 0; j < bucket.length; j++) {
				yield bucket[j]!;
			}
		}
	}

	*iterateDescending(): Generator<Entry<T>> {
		for (let i = this.sortedPriorities.length - 1; i >= 0; i--) {
			const bucket = this.bucketMap.get(this.sortedPriorities[i]!)!;
			for (let j = bucket.length - 1; j >= 0; j--) {
				yield bucket[j]!;
			}
		}
	}

	size(): number {
		return this.length;
	}

	priorities(): readonly number[] {
		return this.sortedPriorities;
	}

	bucket(priority: number): readonly MutableEntry<T>[] {
		return this.bucketMap.get(priority) ?? [];
	}

	clear() {
		for (const entry of this.iterateAscending()) {
			(entry as MutableEntry<T>).bucketIndex = -1;
		}
		this.bucketMap = new Map();
		this.sortedPriorities = [];
		this.length = 0;
	}
}

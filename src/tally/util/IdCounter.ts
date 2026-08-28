export class IdCounter {
	private counter = 0;

	next(): number {
		return this.counter++;
	}
	currentId(): number {
		return this.counter;
	}
}

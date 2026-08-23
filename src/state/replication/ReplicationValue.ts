export type ReplicationValue =
	| null
	| boolean
	| number
	| string
	| readonly ReplicationValue[]
	| { readonly [key: string]: ReplicationValue };

import type { SourceType } from "./SourceType.js";

type Disconnect = () => void;

export interface Source<TData = unknown> {
    readonly type: SourceType<TData>;
    readonly priority: number;

    set(data: TData): void;
    get(): TData;
    onUpdate(callback: (self: this) => void): Disconnect;
    onDestroy(callback: (self: this) => void): Disconnect;
    destroy(): void;
}

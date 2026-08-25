import type { AgentState } from "../../core/AgentState.js";
import type { Source } from "../source/Source.js";
import type { SourceOption } from "../source/SourceOption.js";
import type { AnyDescriptorBinding, DescriptorBinding } from "./DescriptorBinding.js";

export interface DescriptorHandlerContext<TEntity, TSourceData> {
	readonly agent: AgentState<TEntity>;
	addSource(data: TSourceData, options?: SourceOption): Source<TSourceData> | undefined;
}

export type AnyDescriptorHandler = (
	ctx: DescriptorHandlerContext<unknown, unknown>,
	data: unknown
) => AnyDescriptorBinding | undefined;

export type DescriptorHandler<TEntity, TDescriptorData, TSourceData> = (
	ctx: DescriptorHandlerContext<TEntity, TSourceData>,
	data: TDescriptorData
) => DescriptorBinding<TDescriptorData, TSourceData> | undefined;

import type { AgentState } from "../../core/AgentState.js";
import type { Source } from "../source/Source.js";
import type { SourceOption } from "../source/SourceOption.js";
import type { SourceType } from "../source/SourceType.js";
import type { AnyDescriptorBinding, DescriptorBinding } from "./DescriptorBinding.js";

export interface DescriptorHandlerContext<TEntity, TSourceData> {
	readonly agent: AgentState<TEntity>;

	addSource(
		type: SourceType<undefined>,
		data?: TSourceData,
		options?: SourceOption
	): Source<TSourceData> | undefined;
	addSource(
		type: SourceType<TSourceData>,
		data: TSourceData,
		options?: SourceOption
	): Source<TSourceData> | undefined;
}

export type AnyDescriptorHandler = (
	ctx: DescriptorHandlerContext<unknown, unknown>,
	data: unknown
) => AnyDescriptorBinding | undefined;

export type DescriptorHandler<TEntity, TDescriptorData, TSourceData> = (
	ctx: DescriptorHandlerContext<TEntity, TSourceData>,
	data: TDescriptorData
) => DescriptorBinding<TDescriptorData, TSourceData> | undefined;

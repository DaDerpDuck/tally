import type { AgentState } from "../core/AgentState.js";
import type { AnyDescriptorBinding, DescriptorBinding } from "./DescriptorBinding.js";

export type AnyDescriptorHandler = (
	agent: AgentState<unknown>,
	data: unknown
) => AnyDescriptorBinding | undefined;

export type DescriptorHandler<TEntity, TDescriptorData, TSourceData> = (
	agent: AgentState<TEntity>,
	data: TDescriptorData
) => DescriptorBinding<TDescriptorData, TSourceData> | undefined;

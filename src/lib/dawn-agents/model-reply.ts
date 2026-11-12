import { generateText, stepCountIs, tool } from 'ai';
import type { ZodType } from 'zod';
import { modelFor } from './provider.ts';
import {
  capMessage,
  maxOutputTokens,
  resolveChoice,
  type DailyRequestCap,
  type ModelChoice,
} from './model-choice.ts';
import { estimateCost } from './spend.ts';

export type ChatLine = { role: 'user' | 'assistant'; content: string };
export type Generated = { text: string; promptTokens: number; completionTokens: number };
export type Generate = (choice: ModelChoice, system: string, messages: ChatLine[], maxTokens: number) => Promise<Generated>;

/** What the gateway lends a kit: the monthly dollar cap check and the ledger. */
export type SpendHooks = {
  blocked: () => Promise<string | null>;
  record: (entry: { provider: ModelChoice['provider']; model: string; promptTokens: number; completionTokens: number; costUsd: number }) => Promise<void>;
};

/** A tool the model may call. run() does the work and returns text for the model to read. */
export type AgentTool = {
  name: string;
  description: string;
  schema: ZodType;
  run: (input: Record<string, unknown>) => Promise<string>;
};
export type AgentStep = { tool: string; input: Record<string, unknown>; output: string; failed: boolean };
export type AgentRun = Generated & { steps: AgentStep[] };
export type GenerateAgent = (choice: ModelChoice, system: string, messages: ChatLine[], tools: AgentTool[], maxTokens: number, maxSteps: number) => Promise<AgentRun>;

export type KitModel = {
  choice: ModelChoice;
  reply: (system: string, messages: ChatLine[]) => Promise<string>;
  /** One user turn that may call tools several times. It takes one daily slot, however many steps run. */
  agent: (system: string, messages: ChatLine[], tools: AgentTool[], maxSteps?: number) => Promise<{ text: string; steps: AgentStep[] }>;
};

const generateWithProvider: Generate = async (choice, system, messages, maxTokens) => {
  const result = await generateText({
    model: modelFor({ provider: choice.provider, model: choice.model }),
    system,
    messages,
    maxOutputTokens: maxTokens,
  });
  return {
    text: result.text,
    promptTokens: result.usage?.inputTokens ?? 0,
    completionTokens: result.usage?.outputTokens ?? 0,
  };
};

const generateAgentWithProvider: GenerateAgent = async (choice, system, messages, tools, maxTokens, maxSteps) => {
  const steps: AgentStep[] = [];
  const set = Object.fromEntries(tools.map((entry) => [
    entry.name,
    tool({
      description: entry.description,
      inputSchema: entry.schema,
      execute: async (input: unknown) => {
        const args = (input ?? {}) as Record<string, unknown>;
        try {
          const output = await entry.run(args);
          steps.push({ tool: entry.name, input: args, output, failed: false });
          return output;
        } catch (error) {
          const output = error instanceof Error ? error.message.split('\n')[0] : 'The tool stopped.';
          steps.push({ tool: entry.name, input: args, output, failed: true });
          return `Error: ${output}`;
        }
      },
    }),
  ]));
  const result = await generateText({
    model: modelFor({ provider: choice.provider, model: choice.model }),
    system,
    messages,
    tools: set,
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens: maxTokens,
  });
  return {
    text: result.text,
    steps,
    promptTokens: result.totalUsage?.inputTokens ?? result.usage?.inputTokens ?? 0,
    completionTokens: result.totalUsage?.outputTokens ?? result.usage?.outputTokens ?? 0,
  };
};

type Options = {
  requested: unknown;
  cap: DailyRequestCap;
  spend?: SpendHooks;
  env?: Record<string, string | undefined>;
  generate?: Generate;
  generateAgent?: GenerateAgent;
};

/**
 * The model behind a kit turn, or null when no provider key is set (the kit then keeps its fixture reply).
 * Every reply passes the daily request cap, the monthly dollar cap, and one shared max-token limit, whatever the model.
 */
export function createKitModel({ requested, cap, spend, env = process.env, generate = generateWithProvider, generateAgent = generateAgentWithProvider }: Options): KitModel | null {
  const choice = resolveChoice(requested, env);
  if (!choice) return null;
  async function gate(): Promise<void> {
    const blocked = await spend?.blocked();
    if (blocked) throw new Error(blocked);
    if (!cap.take()) throw new Error(capMessage(cap.status()));
  }
  async function record(promptTokens: number, completionTokens: number) {
    const costUsd = estimateCost(choice!.model, promptTokens, completionTokens);
    await spend?.record({ provider: choice!.provider, model: choice!.model, promptTokens, completionTokens, costUsd });
  }
  return {
    choice,
    async reply(system, messages) {
      await gate();
      const made = await generate(choice, system, messages, maxOutputTokens(env));
      await record(made.promptTokens, made.completionTokens);
      return made.text.trim() || 'The model sent an empty reply.';
    },
    async agent(system, messages, tools, maxSteps = 5) {
      await gate();
      const made = await generateAgent(choice, system, messages, tools, maxOutputTokens(env), Math.min(Math.max(1, maxSteps), 8));
      await record(made.promptTokens, made.completionTokens);
      return { text: made.text.trim() || (made.steps.length ? 'Done.' : 'The model sent an empty reply.'), steps: made.steps };
    },
  };
}

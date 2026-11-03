import { streamText, tool } from 'ai';
import { z } from 'zod';
import { assessTask, parseCommand } from '../../../worker/sandbox.mjs';
import type { ComputerResult, ComputerTask } from './computer';
import type { ComputerRouter } from './computer';
import { newId } from './ids';
import { canSpend, estimateCost, spentThisMonth } from './spend';
import { describeRoute, modelFor, publicError } from './provider';
import { clipText, scrubText, secretValuesFromEnv } from './scrub';
import { standInPlan, standInSpeech } from './stand-in';
import type { FileStore } from './store';
import type {
  AgentRecord,
  ChatChannel,
  ChatTurn,
  MessageRecord,
  ThreadRecord,
  ToolCall,
  TrainingProvider,
  Usage,
} from './types';
import { computerLabel } from './types';
import { recipeById, recipeSnippet } from './recipes';
import { webFetch, webSearch } from './web-tools';

type Emit = (event: string, data: unknown) => void;

type Assessed = { decision: 'allow' | 'confirm' | 'deny'; reason: string };

const assess = assessTask as (task: ComputerTask) => Assessed;
const parse = parseCommand as (command: string) => { argv: string[]; shell: boolean; command: string };

export type TurnContext = {
  store: FileStore;
  computers: ComputerRouter;
  fetchImpl?: typeof fetch;
  now?: () => number;
  forceStandIn?: boolean;
  secrets?: string[];
};

export type TurnArgs = {
  thread: ThreadRecord;
  agent: AgentRecord;
  userText: string;
  appendUser: boolean;
  channel: ChatChannel;
  emit: Emit;
  recipeId?: string;
};

export type TurnOutcome = {
  blocked?: boolean;
  message?: MessageRecord;
};

function toolNote(call: ToolCall): string {
  const output = (call.output ?? {}) as { reason?: string; message?: string; files?: string[]; text?: string; path?: string };
  if (call.state === 'needs_confirm') return output.reason || 'Waiting for approval.';
  if (call.state === 'denied') return output.reason || 'Blocked.';
  if (call.state === 'error') return output.message || 'The tool failed.';
  if (call.name === 'computer_write') return `Wrote ${(call.input as { path?: string }).path || 'the file'} in the sandbox.`;
  if (call.name === 'computer_list') {
    const files = output.files ?? [];
    return files.length ? `Sandbox: ${files.join(', ')}.` : 'The sandbox is empty.';
  }
  if (call.name === 'computer_read') return output.text ? `Read the file.` : 'The file was empty.';
  if (call.name === 'computer_exec') return 'The command finished.';
  if (call.name === 'web_search' || call.name === 'web_fetch') return output.text || 'Done.';
  if (call.name === 'remember') return 'Saved to memory.';
  return 'Done.';
}

function renderMessage(message: MessageRecord): string {
  const tools = (message.tools ?? []).map((call) => `[${call.name} ${call.state}] ${toolNote(call)}`).join('\n');
  return [message.content, tools].filter(Boolean).join('\n');
}

function systemPrompt(agent: AgentRecord, memories: string[], thread: ThreadRecord, names: Map<string, string>): string {
  const memory = memories.length ? memories.map((line) => `- ${line}`).join('\n') : 'None yet.';
  const where =
    agent.computer === 'cloud-vm'
      ? 'Cloud VMs are not connected yet.'
      : `Your computer is the ${computerLabel(agent.computer)} worker. Files stay in your own sandbox directory.`;
  const others = thread.agentIds.filter((id) => id !== agent.id).map((id) => names.get(id) || 'another agent');
  const invited = (thread.humans || []).filter((human) => human.status === 'invited').map((human) => human.name);
  const group =
    thread.kind === 'group'
      ? `You are in the group “${thread.title}” with ${[...others, ...invited.map((name) => `${name} (invited, not posting yet)`)].join(', ') || 'the group'}. Reply only as yourself.`
      : 'This is a private chat with Kyle.';
  return [
    `You are ${agent.name}, a personal agent in Dawn Agents. Kyle is the only person you talk with.`,
    agent.instructions,
    group,
    where,
    'Use web_search or web_fetch when Kyle asks about the live web.',
    'Use the computer tools for files and commands. Do not invent tool results.',
    'If a computer tool says it needs approval, stop and wait. Do not retry it.',
    'Use remember for a fact Kyle will want later.',
    'Be concise.',
    `Memories:\n${memory}`,
  ].join('\n\n');
}

function withRecipe(prompt: string, recipeId?: string): string {
  if (!recipeId) return prompt;
  const recipe = recipeById(recipeId);
  if (!recipe) return prompt;
  return `${prompt}\n\nWhen you design a page, follow this Style Recipe and return its HTML if asked.\n${recipeSnippet(recipe)}`;
}

async function runComputer(
  computers: ComputerRouter,
  agent: AgentRecord,
  task: ComputerTask,
): Promise<{ state: ToolCall['state']; output: unknown }> {
  const gate = assess(task);
  if (gate.decision === 'deny') return { state: 'denied', output: { reason: gate.reason } };
  if (gate.decision === 'confirm' && !task.confirmed) return { state: 'needs_confirm', output: { reason: gate.reason } };
  const result: ComputerResult = await computers.resolve(agent.computer).submit(agent.id, task);
  if (result.status === 'ok') {
    return {
      state: 'done',
      output: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        files: result.files,
      },
    };
  }
  if (result.status === 'needs_confirm') return { state: 'needs_confirm', output: { reason: result.reason } };
  if (result.status === 'denied') return { state: 'denied', output: { reason: result.reason } };
  return { state: 'error', output: { message: result.message } };
}

export async function dispatchTool(
  ctx: TurnContext,
  agent: AgentRecord,
  name: string,
  input: Record<string, string>,
  confirmed = false,
): Promise<{ state: ToolCall['state']; output: unknown }> {
  const fetchImpl = ctx.fetchImpl ?? fetch;
  try {
    if (name === 'web_search') {
      const found = await webSearch(input.query || '', fetchImpl);
      return found.ok
        ? { state: 'done', output: { text: found.text } }
        : { state: 'error', output: { message: found.message } };
    }
    if (name === 'web_fetch') {
      const page = await webFetch(input.url || '', fetchImpl);
      return page.ok ? { state: 'done', output: { text: page.text } } : { state: 'error', output: { message: page.message } };
    }
    if (name === 'apply_recipe') {
    const recipe = recipeById(input.id || '');
    if (!recipe) return { state: 'error', output: { message: 'No Style Recipe with that id.' } };
    return { state: 'done', output: { name: recipe.name, html: recipeSnippet(recipe) } };
  }
  if (name === 'remember') {
      const text = (input.text || '').trim().slice(0, 400);
      if (!text) return { state: 'error', output: { message: 'Nothing to remember.' } };
      const data = await ctx.store.read();
      const count = data.memories.filter((memory) => memory.agentId === agent.id).length;
      if (count >= 50) return { state: 'error', output: { message: 'Memory is full for this agent.' } };
      await ctx.store.update((draft) => {
        draft.memories.push({ id: newId('mem'), agentId: agent.id, text, createdAt: (ctx.now ?? Date.now)() });
      });
      return { state: 'done', output: { text } };
    }
    if (name === 'computer_list' || name === 'computer_read' || name === 'computer_write') {
      const action = name === 'computer_list' ? 'list' : name === 'computer_read' ? 'read' : 'write';
      return runComputer(ctx.computers, agent, {
        action,
        path: input.path || '.',
        content: input.content,
      });
    }
    if (name === 'computer_exec') {
      const parsed = parse(input.command || '');
      return runComputer(ctx.computers, agent, {
        action: 'exec',
        command: parsed.command,
        argv: parsed.argv,
        shell: parsed.shell,
        confirmed,
      });
    }
    return { state: 'error', output: { message: 'Unknown tool.' } };
  } catch (error) {
    return { state: 'error', output: { message: publicError(error) } };
  }
}

async function saveMessage(store: FileStore, message: MessageRecord): Promise<void> {
  await store.update((draft) => {
    const index = draft.messages.findIndex((item) => item.id === message.id);
    if (index >= 0) draft.messages[index] = message;
    else draft.messages.push(message);
  });
}

function historyFor(messages: MessageRecord[], threadId: string): ChatTurn[] {
  return messages
    .filter((message) => message.threadId === threadId)
    .slice(-24)
    .map((message) => ({
      role: message.role,
      content: renderMessage(message),
    }))
    .filter((message) => message.content.trim());
}

export async function runAgentTurn(ctx: TurnContext, args: TurnArgs): Promise<TurnOutcome> {
  const now = ctx.now ?? Date.now;
  const secrets = ctx.secrets ?? secretValuesFromEnv();
  const started = now();
  const data = await ctx.store.read();
  const spent = spentThisMonth(data.ledger, started);
  if (!canSpend(spent, data.settings.spendCapUsd)) {
    args.emit('error', {
      message: `Spend cap reached ($${spent.toFixed(2)} of $${data.settings.spendCapUsd.toFixed(2)} this UTC month). Raise it in Settings.`,
    });
    return { blocked: true };
  }

  if (args.appendUser) {
    const userMessage: MessageRecord = {
      id: newId('m'),
      threadId: args.thread.id,
      role: 'user',
      content: args.userText,
      createdAt: started,
      channel: args.channel,
    };
    await ctx.store.update((draft) => {
      draft.messages.push(userMessage);
      const thread = draft.threads.find((item) => item.id === args.thread.id);
      if (thread) thread.updatedAt = started;
    });
    args.emit('user', { message: userMessage });
  }

  const assistant: MessageRecord = {
    id: newId('m'),
    threadId: args.thread.id,
    role: 'assistant',
    agentId: args.agent.id,
    content: '',
    tools: [],
    createdAt: now(),
    channel: args.channel,
  };
  await saveMessage(ctx.store, assistant);
  args.emit('assistant', { message: assistant });

  const fresh = await ctx.store.read();
  const memories = fresh.memories.filter((memory) => memory.agentId === args.agent.id).map((memory) => memory.text);
  const names = new Map(fresh.agents.map((agent) => [agent.id, agent.name]));
  const system = withRecipe(systemPrompt(args.agent, memories, args.thread, names), args.recipeId);
  const messages = historyFor(fresh.messages.filter((message) => message.id !== assistant.id), args.thread.id);
  const route = ctx.forceStandIn ? { provider: 'stand-in' as const, model: 'stand-in' } : describeRoute(args.agent.model);

  let promptTokens = 0;
  let completionTokens = 0;
  try {
    if (route.provider === 'stand-in') {
      await runStandIn(ctx, args, assistant, route.provider);
      promptTokens = Math.ceil((system.length + messages.reduce((sum, message) => sum + message.content.length, 0)) / 4);
      completionTokens = Math.ceil(assistant.content.length / 4);
    } else {
      const usage = await runModel(ctx, args, assistant, system, messages, route);
      promptTokens = usage.promptTokens;
      completionTokens = usage.completionTokens;
    }
  } catch (error) {
    assistant.content = assistant.content || publicError(error);
    args.emit('delta', { messageId: assistant.id, text: assistant.content });
  }

  const usage: Usage = {
    model: route.model,
    provider: route.provider,
    promptTokens,
    completionTokens,
    costUsd: estimateCost(route.model === 'stand-in' ? 'stand-in' : args.agent.model, promptTokens, completionTokens),
  };
  if (route.provider !== 'stand-in') {
    usage.costUsd = estimateCost(route.model, promptTokens, completionTokens);
  }
  assistant.usage = usage;
  const latencyMs = Math.max(0, now() - started);
  const settings = (await ctx.store.read()).settings;
  if (settings.trainingEnabled) {
    const rowId = newId('tr');
    assistant.trainingId = rowId;
    await ctx.store.update((draft) => {
      draft.training.push({
        id: rowId,
        at: started,
        provider: route.provider,
        model: route.model,
        agentId: args.agent.id,
        threadId: args.thread.id,
        messageId: assistant.id,
        latencyMs,
        promptTokens,
        completionTokens,
        costUsd: usage.costUsd,
        system: clipText(scrubText(system, secrets)),
        messages: messages.map((message) => ({
          role: message.role,
          content: clipText(scrubText(message.content, secrets)),
        })),
        response: clipText(scrubText(assistant.content, secrets)),
        feedback: null,
        correction: null,
        channel: args.channel,
      });
      draft.ledger.push({
        id: newId('led'),
        at: started,
        model: route.model,
        provider: route.provider,
        agentId: args.agent.id,
        threadId: args.thread.id,
        promptTokens,
        completionTokens,
        costUsd: usage.costUsd,
        source: args.channel,
      });
    });
  } else {
    await ctx.store.update((draft) => {
      draft.ledger.push({
        id: newId('led'),
        at: started,
        model: route.model,
        provider: route.provider,
        agentId: args.agent.id,
        threadId: args.thread.id,
        promptTokens,
        completionTokens,
        costUsd: usage.costUsd,
        source: args.channel,
      });
    });
  }
  await saveMessage(ctx.store, assistant);
  args.emit('usage', { messageId: assistant.id, usage });
  args.emit('done', { message: assistant });
  return { message: assistant };
}

async function runStandIn(ctx: TurnContext, args: TurnArgs, assistant: MessageRecord, provider: TrainingProvider): Promise<void> {
  void provider;
  const plan = standInPlan(args.userText);
  const notes: string[] = [];
  let paused = false;
  for (const step of plan) {
    const call: ToolCall = { id: newId('tool'), name: step.name, input: step.input, state: 'running' };
    assistant.tools = [...(assistant.tools ?? []), call];
    args.emit('tool', { messageId: assistant.id, tool: call });
    const result = await dispatchTool(ctx, args.agent, step.name, step.input, false);
    call.state = result.state;
    call.output = result.output;
    args.emit('tool', { messageId: assistant.id, tool: call });
    notes.push(toolNote(call));
    await saveMessage(ctx.store, assistant);
    if (result.state === 'needs_confirm') {
      paused = true;
      break;
    }
  }
  if (!paused) {
    const speech = standInSpeech(args.agent.instructions, args.userText, notes);
    let shown = '';
    for (const word of speech.split(/(\s+)/)) {
      shown += word;
      assistant.content = shown;
      args.emit('delta', { messageId: assistant.id, text: shown });
    }
  } else {
    assistant.content = notes.join('\n');
    args.emit('delta', { messageId: assistant.id, text: assistant.content });
  }
}

async function runModel(
  ctx: TurnContext,
  args: TurnArgs,
  assistant: MessageRecord,
  system: string,
  messages: ChatTurn[],
  route: { provider: TrainingProvider; model: string },
): Promise<{ promptTokens: number; completionTokens: number }> {
  let pause = false;
  const model = modelFor(route);
  const track = async (name: string, input: Record<string, string>) => {
    const call: ToolCall = { id: newId('tool'), name, input, state: 'running' };
    assistant.tools = [...(assistant.tools ?? []), call];
    args.emit('tool', { messageId: assistant.id, tool: call });
    const result = await dispatchTool(ctx, args.agent, name, input, false);
    call.state = result.state;
    call.output = result.output;
    args.emit('tool', { messageId: assistant.id, tool: call });
    if (result.state === 'needs_confirm') pause = true;
    await saveMessage(ctx.store, assistant);
    return result.output ?? { state: result.state };
  };

  const result = streamText({
    model,
    system,
    messages,
    maxOutputTokens: 900,
    stopWhen: ({ steps }) => pause || steps.length >= 4,
    tools: {
      web_search: tool({
        description: 'Search the public web.',
        inputSchema: z.object({ query: z.string().min(1).max(200) }),
        execute: async (input) => track('web_search', input),
      }),
      web_fetch: tool({
        description: 'Fetch a public http or https URL and return plain text.',
        inputSchema: z.object({ url: z.string().min(4).max(500) }),
        execute: async (input) => track('web_fetch', input),
      }),
      computer_list: tool({
        description: 'List files in this agent sandbox.',
        inputSchema: z.object({ path: z.string().optional() }),
        execute: async (input) => track('computer_list', { path: input.path || '.' }),
      }),
      computer_read: tool({
        description: 'Read a text file in this agent sandbox.',
        inputSchema: z.object({ path: z.string().min(1).max(240) }),
        execute: async (input) => track('computer_read', input),
      }),
      computer_write: tool({
        description: 'Write a text file in this agent sandbox.',
        inputSchema: z.object({ path: z.string().min(1).max(240), content: z.string().max(200_000) }),
        execute: async (input) => track('computer_write', input),
      }),
      computer_exec: tool({
        description: 'Run a command in this agent sandbox. Risky commands wait for Kyle.',
        inputSchema: z.object({ command: z.string().min(1).max(500) }),
        execute: async (input) => track('computer_exec', input),
      }),
      remember: tool({
        description: 'Save a durable memory.',
        inputSchema: z.object({ text: z.string().min(1).max(400) }),
        execute: async (input) => track('remember', input),
      }),
      apply_recipe: tool({
        description: 'Load a Style Recipe HTML and CSS snippet by id.',
        inputSchema: z.object({ id: z.string().min(2).max(80) }),
        execute: async (input) => track('apply_recipe', input),
      }),
    },
  });

  let promptTokens = 0;
  let completionTokens = 0;
  for await (const part of result.stream) {
    if (part.type === 'text-delta') {
      assistant.content += part.text;
      args.emit('delta', { messageId: assistant.id, text: assistant.content });
    } else if (part.type === 'finish') {
      promptTokens = part.totalUsage.inputTokens ?? promptTokens;
      completionTokens = part.totalUsage.outputTokens ?? completionTokens;
    } else if (part.type === 'error') {
      throw new Error(publicError(part.error));
    }
  }
  return { promptTokens, completionTokens };
}

export async function resumeTool(
  ctx: TurnContext,
  messageId: string,
  toolCallId: string,
  allow: boolean,
): Promise<MessageRecord | null> {
  const data = await ctx.store.read();
  const message = data.messages.find((item) => item.id === messageId);
  if (!message) return null;
  const call = message.tools?.find((item) => item.id === toolCallId);
  if (!call || call.state !== 'needs_confirm') return message;
  const agent = data.agents.find((item) => item.id === message.agentId);
  if (!agent) return message;
  if (!allow) {
    call.state = 'denied';
    call.output = { reason: 'You denied this command.' };
  } else {
    const input = (call.input ?? {}) as Record<string, string>;
    const result = await dispatchTool(ctx, agent, call.name, input, true);
    call.state = result.state;
    call.output = result.output;
  }
  if (!message.content.trim()) message.content = toolNote(call);
  await saveMessage(ctx.store, message);
  return message;
}

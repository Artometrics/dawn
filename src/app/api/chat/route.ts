import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

// Initialize Google provider with fallback keys
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Universal OpenRouter provider
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

function resolveModel(requestedModel: string = 'gemini-3.8-flash') {
  let normalized = requestedModel.toLowerCase().trim();

  // Map legacy / deprecated names to current active Gemini models
  if (
    normalized.includes('gemini-2') ||
    normalized.includes('gemini-flash') ||
    normalized === 'gemini' ||
    normalized === 'flash'
  ) {
    normalized = 'gemini-3.8-flash';
  } else if (
    normalized.includes('gemini-1.5') ||
    normalized.includes('gemini-pro') ||
    normalized === 'pro'
  ) {
    normalized = 'gemini-3.1-pro-preview';
  }

  if (normalized.startsWith('gemini')) {
    return google(normalized);
  }

  // Any other model (e.g. x-ai/grok-2, claude-3.7-sonnet, deepseek-chat)
  if (process.env.OPENROUTER_API_KEY) {
    return openrouter(requestedModel);
  }

  // Fallback to gemini-3.8-flash
  return google('gemini-3.8-flash');
}

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      model = 'gemini-3.8-flash', 
      teammate,
      codeContext 
    } = await req.json();

    const selectedModel = resolveModel(model);

    // Build system prompt with Teammate identity, instructions, and persistent memories
    const systemParts: string[] = [];

    if (teammate) {
      systemParts.push(
        `You are ${teammate.name}, serving in the role of "${teammate.role}" inside Dawn Studio.`,
        teammate.instructions
      );

      if (teammate.memory && teammate.memory.length > 0) {
        systemParts.push(
          '\n--- PERSISTENT MEMORIES & PROJECT NOTES ---',
          ...teammate.memory.map((m: string, i: number) => `${i + 1}. ${m}`),
          '--------------------------------------------'
        );
      }
    } else {
      systemParts.push(
        'You are Dawn: a high-leverage software engineer, code intelligence assistant, and reasoning engine inspired by Grok and Cursor.'
      );
    }

    if (codeContext && codeContext.content) {
      systemParts.push(
        `\n--- ACTIVE CODE CONTEXT ---`,
        `File: ${codeContext.filename || 'untitled'} (${codeContext.language || 'typescript'})`,
        `\`\`\`${codeContext.language || 'typescript'}\n${codeContext.content}\n\`\`\``,
        `---------------------------`
      );
    }

    const result = streamText({
      model: selectedModel,
      system: systemParts.join('\n\n'),
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Error in Dawn chat route:', error);
    return new Response(`Error in Dawn AI Gateway: ${error.message || 'Unknown error'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { GEMINI_FAST, remapModelId } from '@/lib/models';

// Initialize Google provider with fallback keys
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Universal OpenRouter provider
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

function resolveModel(requestedModel?: string) {
  const id = remapModelId(requestedModel);

  if (id.startsWith('gemini')) {
    return google(id);
  }

  // OpenRouter models, including x-ai/grok-4.7 (grok-2-1212 is remapped above).
  if (process.env.OPENROUTER_API_KEY) {
    return openrouter(id);
  }

  return google(GEMINI_FAST);
}

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      model = GEMINI_FAST, 
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

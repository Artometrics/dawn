import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

// Providers
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const xai = createOpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      model = 'gemini-2.0-flash', 
      teammate,
      codeContext 
    } = await req.json();

    let selectedModel;

    if (model.startsWith('gemini')) {
      selectedModel = google(model);
    } else if (model.startsWith('grok') && process.env.XAI_API_KEY) {
      selectedModel = xai(model);
    } else {
      // Default to OpenRouter for universal routing (including x-ai/grok-2, deepseek, etc.)
      selectedModel = openrouter(model);
    }

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
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

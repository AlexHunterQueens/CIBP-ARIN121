import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the exact system prompt from prompts/v5.md
const promptFilePath = path.resolve(__dirname, 'prompts/v5.md');
let systemInstruction = '';
try {
  systemInstruction = fs.readFileSync(promptFilePath, 'utf-8');
} catch (err) {
  console.error('Failed to read prompts/v5.md, using embedded fallback', err);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

let activeModel = 'gemini-3.5-flash-lite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    model: activeModel,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required and must not be empty' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not set on the server. Please check the Secrets panel in AI Studio.',
      });
    }

    // Format messages for @google/genai
    // Roles supported are 'user' and 'model'
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    const is404Error = (err: any) => {
      const status = err?.status || err?.code || err?.error?.code;
      const msg = (String(err?.message || '') + ' ' + String(err?.error?.message || '')).toLowerCase();
      return (
        status === 404 ||
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('not_found') ||
        msg.includes('model not found') ||
        msg.includes('is not supported')
      );
    };

    const is503Error = (err: any) => {
      const status = err?.status || err?.code || err?.error?.code;
      const msg = (String(err?.message || '') + ' ' + String(err?.error?.message || '')).toLowerCase();
      return (
        status === 503 ||
        msg.includes('503') ||
        msg.includes('unavailable') ||
        msg.includes('high demand')
      );
    };

    const is429Error = (err: any) => {
      const status = err?.status || err?.code || err?.error?.code;
      const msg = (String(err?.message || '') + ' ' + String(err?.error?.message || '')).toLowerCase();
      return (
        status === 429 ||
        msg.includes('429') ||
        msg.includes('resource_exhausted') ||
        msg.includes('quota')
      );
    };

    const isDailyQuotaError = (err: any) => {
      const msg = (String(err?.message || '') + ' ' + String(err?.error?.message || '') + ' ' + JSON.stringify(err || '')).toLowerCase();
      return (
        msg.includes('per day') ||
        msg.includes('per-day') ||
        msg.includes('daily') ||
        msg.includes('day_quota') ||
        msg.includes('day quota') ||
        msg.includes('requests per day')
      );
    };

    // Low-level call to Gemini with model fallback (3.5-flash-lite -> 3.1-flash-lite on 404)
    const callModelWithFallback = async (): Promise<any> => {
      try {
        return await ai.models.generateContent({
          model: activeModel,
          contents: formattedContents,
          config: {
            systemInstruction: systemInstruction,
          },
        });
      } catch (err: any) {
        if (activeModel === 'gemini-3.5-flash-lite' && is404Error(err)) {
          console.warn('gemini-3.5-flash-lite returned 404 or model not found, falling back to gemini-3.1-flash-lite');
          activeModel = 'gemini-3.1-flash-lite';
          return await ai.models.generateContent({
            model: activeModel,
            contents: formattedContents,
            config: {
              systemInstruction: systemInstruction,
            },
          });
        }
        throw err;
      }
    };

    // 503 retry helper with exponential backoff (2s to 20s, up to 6 times)
    const callWith503Retry = async (retriesLeft = 6, currentDelay = 2000): Promise<any> => {
      try {
        return await callModelWithFallback();
      } catch (err: any) {
        if (retriesLeft > 0 && is503Error(err)) {
          console.warn(`Gemini API 503 unavailable, retrying in ${currentDelay}ms (${retriesLeft} retries remaining)...`, err?.message);
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          const nextDelay = Math.min(20000, currentDelay * 2);
          return callWith503Retry(retriesLeft - 1, nextDelay);
        }
        throw err;
      }
    };

    // Handle 429 separately from 503
    let response: any;
    try {
      response = await callWith503Retry();
    } catch (err: any) {
      if (is429Error(err)) {
        if (isDailyQuotaError(err)) {
          console.warn('Daily free limit reached for Gemini model, returning error without retry.');
          return res.status(429).json({
            error: 'Daily free limit reached. Your answers are saved. Try again tomorrow.',
            isDailyLimit: true,
          });
        }

        // Per-minute 429
        // If client requested direct handling for UI updates, return per-minute limit notice
        if (req.headers['x-client-retry'] === 'true') {
          console.warn('Per-minute 429 encountered, returning 15s retry notice to client.');
          return res.status(429).json({
            error: 'Free tier limit, waiting a few seconds...',
            isPerMinuteLimit: true,
            retryAfter: 15,
          });
        }

        // Otherwise (e.g. standalone server request), wait 15 seconds and retry up to 4 times
        console.warn('Per-minute 429 encountered on server, waiting 15 seconds and retrying up to 4 times...');
        let succeeded = false;
        let lastErr = err;
        for (let attempt = 1; attempt <= 4; attempt++) {
          console.warn(`Per-minute 429 retry ${attempt}/4: waiting 15 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 15000));
          try {
            response = await callWith503Retry();
            succeeded = true;
            break;
          } catch (retryErr: any) {
            lastErr = retryErr;
            if (isDailyQuotaError(retryErr)) {
              return res.status(429).json({
                error: 'Daily free limit reached. Your answers are saved. Try again tomorrow.',
                isDailyLimit: true,
              });
            }
            if (!is429Error(retryErr)) {
              throw retryErr;
            }
          }
        }
        if (!succeeded) {
          throw lastErr;
        }
      } else {
        throw err;
      }
    }

    const replyText = response?.text ?? '';
    return res.json({ text: replyText });
  } catch (error: any) {
    console.error('Error generating content with Gemini:', error);
    const errorMessage = error?.message || 'Failed to generate response from Gemini API';
    return res.status(500).json({ error: errorMessage });
  }
});

// Setup Vite middleware in dev or static files in production
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CIBP server listening on http://0.0.0.0:${PORT}`);
});

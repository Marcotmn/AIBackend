/*import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';

const app = express();
app.use(cors()); // in prod limita origin
app.use(express.json({ limit: '1mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/', (_req, res) => res.send('OK'));

app.post('/api/ask', async (req, res) => {
  try {
    const { prompt, temperature } = req.body as { prompt?: string; temperature?: number };
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Missing or invalid "prompt"' });
    }
    const temp = typeof temperature === 'number' ? Math.max(0, Math.min(1, temperature)) : 0.2;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt.trim() }],
      temperature: temp
    });

    const text = completion.choices[0]?.message?.content ?? '';
    const usage = (completion as any).usage ?? undefined;

    return res.json({ text, model: completion.model, usage });
  } catch (err: any) {
    console.error('[ask:error]', err?.response?.data ?? err?.message ?? err);
    const status = err?.status ?? err?.response?.status ?? 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: 'OpenAI request failed' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
*/

import "dotenv/config";
import express from "express";
import cors from "cors";
import { OpenAI } from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const USE_MOCK = process.env.USE_MOCK === "1";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (_req, res) => res.send("OK"));

app.post("/api/ask", async (req, res) => {
  try {
    const { prompt, temperature } = req.body as {
      prompt?: string;
      temperature?: number;
    };
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: 'Missing or invalid "prompt"' });
    }

    if (USE_MOCK) {
      // Risposta finta ma utile per sviluppare UI/flow
      const text = `🧪 MOCK REPLY\nPrompt: ${prompt
        .trim()
        .slice(0, 160)}\n\nSuggerimento: billing non attivo o quota esaurita.`;
      return res.json({
        text,
        model: "mock",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });
    }

    const temp =
      typeof temperature === "number"
        ? Math.max(0, Math.min(1, temperature))
        : 0.2;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt.trim() }],
      temperature: temp,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const usage = (completion as any).usage ?? undefined;
    return res.json({ text, model: completion.model, usage });
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const message = (err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown error") as string;

    // Logging server-side
    console.error("[ask:error]", status, message);

    // Messaggi più chiari al client
    if (status === 401) {
      return res
        .status(401)
        .json({ error: "Unauthorized: chiave API mancante o errata" });
    }
    if (status === 429 && /quota|exceeded/i.test(message)) {
      return res
        .status(429)
        .json({
          error:
            "Quota esaurita: attiva billing o alza il monthly limit nel tuo account OpenAI",
        });
    }
    if (status === 429) {
      return res
        .status(429)
        .json({ error: "Rate limit superato: riprova tra qualche secondo" });
    }
    return res.status(500).json({ error: "OpenAI request failed" });
  }
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(
    `Server listening on http://localhost:${PORT}  (mock=${USE_MOCK})`
  );
});

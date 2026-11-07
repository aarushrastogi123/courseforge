type OpenAIResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  error?: { message?: string; status?: string };
};

export type AIProvider = "gemini" | "openai";

class AIRequestError extends Error {
  constructor(
    message: string,
    readonly provider: AIProvider,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}

export function getAIConfiguration() {
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini" as const, apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-3.8-flash" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai" as const, apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-6-luna" };
  }
  return { provider: null, apiKey: undefined, model: undefined };
}

async function requestGemini(systemPrompt: string, input: unknown, apiKey: string, model: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 7000, thinkingConfig: { thinkingLevel: "low" } },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    const detail = timedOut ? "The request timed out after 90 seconds." : "The network connection failed.";
    throw new AIRequestError("Gemini could not be reached. " + detail + " Your brief and saved lesson are preserved; retry when the connection is available.", "gemini", null);
  }
  const payload = await response.json().catch(() => null) as GeminiResponse | null;
  if (!response.ok) {
    const detail = typeof payload?.error?.message === "string" ? payload.error.message : "Gemini request failed.";
    throw new AIRequestError("Gemini request failed (" + response.status + "): " + detail, "gemini", response.status);
  }
  const candidate = payload?.candidates?.[0];
  const content = candidate?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!content) {
    const reason = candidate?.finishReason ? " (" + candidate.finishReason + ")" : "";
    throw new Error("Gemini returned no structured lesson data" + reason + ". Your brief is preserved; please retry.");
  }
  return content;
}

async function requestOpenAI(systemPrompt: string, input: unknown, apiKey: string, model: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "developer", content: systemPrompt },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 7000,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new Error("OpenAI could not be reached. Your brief and saved lesson are preserved; retry when the connection is available.");
  }
  const payload = await response.json().catch(() => null) as OpenAIResponse | null;
  if (!response.ok) {
    const detail = typeof payload?.error?.message === "string" ? payload.error.message : "OpenAI request failed.";
    throw new Error("OpenAI request failed (" + response.status + "): " + detail);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no structured lesson data. Your brief is preserved; please retry.");
  return content;
}

export async function requestJSONFromModel<T>(systemPrompt: string, input: unknown): Promise<{ value: T; model: string; provider: AIProvider }> {
  const config = getAIConfiguration();
  if (!config.apiKey || !config.provider || !config.model) {
    throw new Error("Add GEMINI_API_KEY or OPENAI_API_KEY to .env.local to use model-assisted lesson generation and QC.");
  }
  let model = config.model;
  let content: string;
  if (config.provider === "gemini") {
    try {
      content = await requestGemini(systemPrompt, input, config.apiKey, model);
    } catch (error) {
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
      const shouldFallback = error instanceof AIRequestError &&
        error.provider === "gemini" &&
        (error.status === null || error.status === 429 || error.status >= 500) &&
        fallbackModel !== model;
      if (!shouldFallback) throw error;

      const primaryModel = model;
      model = fallbackModel;
      try {
        content = await requestGemini(systemPrompt, input, config.apiKey, model);
      } catch (fallbackError) {
        const primaryMessage = error instanceof Error ? error.message : "The primary Gemini model failed.";
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "The fallback Gemini model failed.";
        throw new Error(primaryMessage + " Fallback model " + model + " also failed: " + fallbackMessage);
      }
      console.warn("Gemini model " + primaryModel + " was unavailable; completed the request with fallback model " + model + ".");
    }
  } else {
    content = await requestOpenAI(systemPrompt, input, config.apiKey, model);
  }
  try {
    return { value: JSON.parse(content) as T, model, provider: config.provider };
  } catch {
    throw new Error(config.provider + " returned unreadable structured data. Your brief is preserved; please retry.");
  }
}

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  error?: { message?: string; status?: string };
};

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

export type AIProvider = "gemini" | "anthropic" | "openai" | "openai-compatible";

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
  const requestedProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const provider = requestedProvider || (process.env.GEMINI_API_KEY ? "gemini" : process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : process.env.OPENAI_COMPATIBLE_API_KEY || process.env.AI_API_KEY ? "openai-compatible" : "");
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return { provider: "gemini" as const, apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-3.8-flash" };
  }
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic" as const, apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5" };
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return { provider: "openai" as const, apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-6-luna" };
  }
  if (provider === "openai-compatible") {
    const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY || process.env.AI_API_KEY;
    const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim().replace(/\/+$/, "");
    if (apiKey && baseUrl) return { provider: "openai-compatible" as const, apiKey, model: process.env.OPENAI_COMPATIBLE_MODEL || process.env.AI_MODEL || "" , baseUrl };
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

async function requestAnthropic(systemPrompt: string, input: unknown, apiKey: string, model: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 7000, system: systemPrompt, messages: [{ role: "user", content: JSON.stringify(input) }] }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new Error("Claude could not be reached. Your brief and saved lesson are preserved; retry when the connection is available.");
  }
  const payload = await response.json().catch(() => null) as AnthropicResponse | null;
  if (!response.ok) {
    const detail = typeof payload?.error?.message === "string" ? payload.error.message : "Claude request failed.";
    throw new Error("Claude request failed (" + response.status + "): " + detail);
  }
  const content = payload?.content?.filter((part) => part.type === "text").map((part) => part.text || "").join("").trim();
  if (!content) throw new Error("Claude returned no structured lesson data. Your brief is preserved; please retry.");
  return content;
}

async function requestOpenAICompatible(systemPrompt: string, input: unknown, apiKey: string, model: string, baseUrl: string): Promise<string> {
  const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl + (baseUrl.endsWith("/v1") ? "/chat/completions" : "/v1/chat/completions");
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: JSON.stringify(input) }], response_format: { type: "json_object" }, max_tokens: 7000 }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new Error("The configured OpenAI-compatible AI service could not be reached. Your brief and saved lesson are preserved; retry when the connection is available.");
  }
  const payload = await response.json().catch(() => null) as OpenAIResponse | null;
  if (!response.ok) {
    const detail = typeof payload?.error?.message === "string" ? payload.error.message : "AI request failed.";
    throw new Error("Configured AI service request failed (" + response.status + "): " + detail);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Configured AI service returned no structured lesson data. Your brief is preserved; please retry.");
  return content;
}

export async function requestJSONFromModel<T>(systemPrompt: string, input: unknown): Promise<{ value: T; model: string; provider: AIProvider }> {
  const config = getAIConfiguration();
  if (!config.apiKey || !config.provider || !config.model) {
    throw new Error("Configure AI_PROVIDER and the matching provider API key to use model-assisted lesson generation and QC.");
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
  } else if (config.provider === "anthropic") {
    content = await requestAnthropic(systemPrompt, input, config.apiKey, model);
  } else if (config.provider === "openai") {
    content = await requestOpenAI(systemPrompt, input, config.apiKey, model);
  } else {
    const baseUrl = "baseUrl" in config ? config.baseUrl : undefined;
    if (!baseUrl || !model) throw new Error("Set OPENAI_COMPATIBLE_BASE_URL and OPENAI_COMPATIBLE_MODEL for the configured compatible AI service.");
    content = await requestOpenAICompatible(systemPrompt, input, config.apiKey, model, baseUrl);
  }
  try {
    return { value: JSON.parse(content) as T, model, provider: config.provider };
  } catch {
    throw new Error(config.provider + " returned unreadable structured data. Your brief is preserved; please retry.");
  }
}

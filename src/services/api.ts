import { InterviewConfig, InterviewEvaluation, Message } from "../types";

// Helper to handle bad responses and throw specific RateLimitError if status is 429
async function handleResponseError(response: Response, defaultMessage: string) {
  if (response.status === 429) {
    const errorData = await response.json().catch(() => ({}));
    const rateErr = new Error(errorData.message || "Você atingiu o limite de cota da API do Gemini.");
    (rateErr as any).isRateLimited = true;
    (rateErr as any).status = 429;
    (rateErr as any).retryAfter = errorData.retryAfter || 14400; // 4 hours in seconds
    throw rateErr;
  }
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || defaultMessage);
}

export async function initInterview(config: InterviewConfig): Promise<{ questions: string[]; actualModelUsed?: string }> {
  const token = localStorage.getItem("auth_token_v1");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/init-interview", {
    method: "POST",
    headers,
    body: JSON.stringify({ config }),
  });

  if (!response.ok) {
    await handleResponseError(response, "Ocorreu um erro ao iniciar a entrevista.");
  }

  const data = await response.json();
  return { questions: data.questions, actualModelUsed: data.actualModelUsed };
}

export async function evaluateInterview(
  config: InterviewConfig,
  chatHistory: Message[]
): Promise<{ evaluation: InterviewEvaluation; actualModelUsed?: string }> {
  const token = localStorage.getItem("auth_token_v1");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers,
    body: JSON.stringify({ config, chatHistory }),
  });

  if (!response.ok) {
    await handleResponseError(response, "Ocorreu um erro ao avaliar a entrevista.");
  }

  const data = await response.json();
  return { evaluation: data.evaluation, actualModelUsed: data.actualModelUsed };
}

export async function getNextTurnResponse(
  config: InterviewConfig,
  chatHistory: Message[],
  questions: string[],
  currentQuestionIndex: number
): Promise<{ text: string; clarificationRequired: boolean; endOfInterview: boolean; actualModelUsed?: string }> {
  const token = localStorage.getItem("auth_token_v1");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/interview/next-turn", {
    method: "POST",
    headers,
    body: JSON.stringify({ config, chatHistory, questions, currentQuestionIndex }),
  });

  if (!response.ok) {
    await handleResponseError(response, "Erro ao obter a resposta do entrevistador.");
  }

  return response.json();
}

export async function analyzeGuestCv(config: InterviewConfig): Promise<{ evaluation: InterviewEvaluation; actualModelUsed?: string }> {
  const response = await fetch("/api/guest/analyze-cv", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ config }),
  });

  if (!response.ok) {
    await handleResponseError(response, "Ocorreu um erro ao analisar o currículo.");
  }

  const data = await response.json();
  return { evaluation: data.evaluation, actualModelUsed: data.actualModelUsed };
}

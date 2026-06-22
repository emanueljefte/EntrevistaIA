import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import fs from "fs";
import interviewRouter from "./server/src/routes/interview";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// --- SECURE LOCAL JSON DATABASE ---
const DB_FILE = path.join(process.cwd(), "db.json");

interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role?: "candidato" | "recrutador" | string;
}

interface UserSessionItem {
  id: string;
  userId: string;
  date: string;
  config: any;
  questions: string[];
  answers: string[];
  chatHistory: any[];
  evaluation?: any;
}

interface ActiveSession {
  token: string;
  userId: string;
  expires: number;
}

interface TempResetCode {
  email: string;
  code: string;
  expires: number;
}

// In-Memory state for quick codes (since container restarts are rare within sessions)
const tempResetCodes = new Map<string, TempResetCode>();

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [], sessions: [], activeSessions: [] }, null, 2),
      "utf8"
    );
  } else {
    // Check if format contains required tables
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      let updated = false;
      if (!data.users) { data.users = []; updated = true; }
      if (!data.sessions) { data.sessions = []; updated = true; }
      if (!data.activeSessions) { data.activeSessions = []; updated = true; }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
      }
    } catch {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify({ users: [], sessions: [], activeSessions: [] }, null, 2),
        "utf8"
      );
    }
  }
}
initDb();

function readDb(): { users: User[]; sessions: UserSessionItem[]; activeSessions: ActiveSession[] } {
  try {
    const content = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return { users: [], sessions: [], activeSessions: [] };
  }
}

function writeDb(data: { users: User[]; sessions: UserSessionItem[]; activeSessions: ActiveSession[] }) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Cryptography Helpers
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token de acesso não fornecido." });
  }

  const db = readDb();
  const session = db.activeSessions?.find((s) => s.token === token && s.expires > Date.now());
  if (!session) {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: "Usuário não encontrado." });
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role || "candidato" };
  next();
}

function tryGetAuthenticatedUser(req: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;

  const db = readDb();
  const session = db.activeSessions?.find((s) => s.token === token && s.expires > Date.now());
  if (!session) return null;

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role || "candidato" };
}

// Helper to initialize Gemini SDK
function getGeminiClient(clientApiKey?: string) {
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please configure it.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to identify rate limit / quota / temporary capacity errors from Gemini API
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429 || status === 503) return true;
  
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("limit exceeded") ||
    msg.includes("rate_limit") ||
    msg.includes("high demand") ||
    msg.includes("temporary") ||
    msg.includes("unavailable")
  );
}

// Wrapper to perform API calls with exponential backoff retries and sibling model fallback
async function generateContentWithRetryAndFallback(
  ai: any,
  params: any,
  retries = 3,
  initialDelayMs = 2000
) {
  let attempt = 0;
  let delay = initialDelayMs;
  let lastError: any = null;

  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  for (const model of modelsToTry) {
    params.model = model;
    attempt = 0;
    delay = initialDelayMs;

    while (attempt < retries) {
      try {
        console.log(`[Gemini Request] Model ${model}, attempt ${attempt + 1}...`);
        const response = await ai.models.generateContent(params);
        return response;
      } catch (error: any) {
        lastError = error;
        attempt++;
        
        const isTemporary = isRateLimitError(error);
        if (!isTemporary) {
          console.error(`[Gemini Error] Non-retryable error/fatal under model ${model}:`, error.message || error);
          break; 
        }

        if (attempt >= retries) {
          console.warn(`[Gemini Error] Exhausted ${retries} attempts for model ${model}. Error:`, error.message || error);
          break; 
        }

        console.warn(`[Gemini Retry] Rate limit/high demand (503/429) hit for ${model}. Retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; 
      }
    }
  }

  throw lastError;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- AUTHENTICATION ENDPOINTS ---

app.post("/api/auth/signup", (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    const emailNorm = email.toLowerCase().trim();
    if (!emailNorm.includes("@")) {
      return res.status(400).json({ error: "E-mail com formato inválido." });
    }

    const db = readDb();
    if (db.users.some((u) => u.email === emailNorm)) {
      return res.status(400).json({ error: "Este e-mail já está registrado. Não pode haver uma conta de Candidato e Recrutador com o mesmo e-mail." });
    }

    const userRole = role === "recrutador" ? "recrutador" : "candidato";

    // Secure Pass hash
    const { salt, hash } = hashPassword(password);
    const id = "usr-" + crypto.randomBytes(8).toString("hex");

    const newUser: User = {
      id,
      name,
      email: emailNorm,
      passwordHash: hash,
      salt,
      role: userRole,
    };

    db.users.push(newUser);

    // Create session token (Valid for 7 days)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;

    db.activeSessions.push({
      token,
      userId: id,
      expires,
    });

    writeDb(db);

    res.json({
      token,
      user: { id, email: emailNorm, name, role: userRole },
      message: "Cadastro realizado com sucesso!",
    });
  } catch (err: any) {
    console.error("Cadastro erro:", err);
    res.status(500).json({ error: "Falha ao registrar conta no servidor." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const emailNorm = email.toLowerCase().trim();
    const db = readDb();
    const user = db.users.find((u) => u.email === emailNorm);

    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      return res.status(401).json({ error: "Credenciais incorretas. Verifique seu e-mail e senha." });
    }

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // Clear old expired sessions of this user to clean DB
    db.activeSessions = db.activeSessions.filter(
      (s) => !(s.userId === user.id && s.expires < Date.now())
    );

    db.activeSessions.push({
      token,
      userId: user.id,
      expires,
    });

    writeDb(db);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role || "candidato" },
    });
  } catch (err: any) {
    console.error("Login erro:", err);
    res.status(500).json({ error: "Erro de servidor ao processar login." });
  }
});

app.post("/api/auth/recover", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "O e-mail é obrigatório." });
    }

    const emailNorm = email.toLowerCase().trim();
    const db = readDb();
    const user = db.users.find((u) => u.email === emailNorm);

    if (!user) {
      return res.status(404).json({ error: "Endereço de e-mail não localizado no sistema." });
    }

    // Generate a secure 6 digit token code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15 mins expiry

    tempResetCodes.set(emailNorm, {
      email: emailNorm,
      code: resetCode,
      expires,
    });

    // In production we would email this. For development sandbox friendliness, we return it to display!
    res.json({
      success: true,
      message: "Instruções e código de redefinição gerados com sucesso.",
      resetCode, // Expose to frontend so user can test without real SMTP
    });
  } catch (err: any) {
    res.status(500).json({ error: "Falha ao processar solicitação de redefinição." });
  }
});

app.post("/api/auth/reset", (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: "Todos os campos e o código são obrigatórios." });
    }

    const emailNorm = email.toLowerCase().trim();
    const request = tempResetCodes.get(emailNorm);

    if (!request || request.code !== resetCode.trim() || request.expires < Date.now()) {
      return res.status(400).json({ error: "Código de recuperação inválido ou expirado." });
    }

    const db = readDb();
    const userIndex = db.users.findIndex((u) => u.email === emailNorm);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Regenerate password hash
    const { salt, hash } = hashPassword(newPassword);
    db.users[userIndex].salt = salt;
    db.users[userIndex].passwordHash = hash;

    // Consume the resetCode
    tempResetCodes.delete(emailNorm);

    // Revoke all existing sessions for this user for safety
    db.activeSessions = db.activeSessions.filter((s) => s.userId !== db.users[userIndex].id);

    writeDb(db);

    res.json({ success: true, message: "Sua senha foi redefinida com sucesso! Faça login." });
  } catch (err: any) {
    res.status(500).json({ error: "Erro de processamento ao redefinir senha." });
  }
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// --- SESSION STORAGE ENDPOINTS ---

app.get("/api/sessions", authenticateToken, (req: any, res) => {
  try {
    const db = readDb();
    const userSessions = db.sessions.filter((s) => s.userId === req.user.id);
    res.json({ sessions: userSessions });
  } catch (err: any) {
    res.status(500).json({ error: "Impossível recuperar sessões." });
  }
});

app.post("/api/sessions/save", authenticateToken, (req: any, res) => {
  try {
    const { session } = req.body;
    if (!session) {
      return res.status(400).json({ error: "Parâmetro session obrigatório." });
    }

    res.status(200).json({ success: true });

    setTimeout(() => {
      try {
        const db = readDb();
        const existingIndex = db.sessions.findIndex((s) => s.id === session.id);
        const sessionItem: UserSessionItem = {
          ...session,
          userId: req.user.id,
        };

        if (existingIndex !== -1) {
          db.sessions[existingIndex] = sessionItem;
        } else {
          db.sessions.unshift(sessionItem);
        }
        console.log(db);
        
        writeDb(db);
      } catch (writeErr) {
        console.error("Erro ao gravar db.json em background:", writeErr);
      }
    }, 0);

  } catch (err: any) {
    // Caso caia aqui antes de responder
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
});

app.post("/api/sessions/clear", authenticateToken, (req: any, res) => {
  try {
    const db = readDb();
    db.sessions = db.sessions.filter((s) => s.userId !== req.user.id);
    writeDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Falha ao limpar histórico." });
  }
});

// --- DYNAMIC PREP INSIGHTS ROUTE (AJAX CONTENT LOADING) ---

app.get("/api/insights", async (req, res) => {
  try {
    const category = (req.query.category as string) || "Tech";
    const userApiKey = req.query.apiKey as string;

    const insightsPrompt = `Você é um Consultor de Carreira de elite especializado na área de: ${category}.
    Gere exatamente 3 táticas de entrevista de mercado práticas e tendências urgentes do cenário contemporâneo de contratações corporativas.
    Retorne a resposta estritamente como um objeto JSON com uma chave 'insights' que contém uma lista/array de objetos com o seguinte esquema:
    {
      "insights": [
        {
          "title": "Título curto em português",
          "description": "Explicação pragmática de 2 linhas sobre como dominar esse aspecto na entrevista",
          "trend": true/false // se é uma tendência recente de 2026 ou uma técnica bem-estabelecida
        }
      ]
    }
    Seja focado em recrutamento. Retorne estritamente o JSON definido.`;

    let insightsList = [];
    let isRateLimited = false;

    // Check if we can use Gemini
    const keyToUse = userApiKey || process.env.GEMINI_API_KEY;
    if (keyToUse && keyToUse !== "undefined") {
      try {
        const ai = getGeminiClient(keyToUse);
        const response = await generateContentWithRetryAndFallback(ai, {
          model: "gemini-3.5-flash",
          contents: insightsPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                insights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      trend: { type: Type.BOOLEAN }
                    },
                    required: ["title", "description", "trend"]
                  }
                }
              },
              required: ["insights"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          insightsList = parsed.insights;
        }
      } catch (geminiError: any) {
        const msg = geminiError?.message || String(geminiError);
        if (isRateLimitError(geminiError)) {
          isRateLimited = true;
          console.log("[Gemini Rate Limit] /api/dashboard/insights: Free tier quota reached or high load. Activated local mock insights fallback.");
        } else {
          console.log(`[Gemini Error] /api/dashboard/insights: Using insights fallback. Reason: ${msg}`);
        }
      }
    }

    // Fallback if Gemini failed or is not available
    if (!insightsList || insightsList.length === 0) {
      if (category === "Tech") {
        insightsList = [
          {
            title: "Simulações de System Design",
            description: "Espera-se que candidatos saibam desenhar arquiteturas robustas e justifiquem opções de bancos de dados SQL vs NoSQL baseadas em tradeoffs.",
            trend: true
          },
          {
            title: "Performance de Código & Tradeoffs",
            description: "Sempre mencione e analise a complexidade Big O de tempo e espaço de sua solução para demonstrar profundo rigor analítico.",
            trend: false
          },
          {
            title: "Testabilidade e Arquitetura Limpa",
            description: "Explicar como estruturar código promovendo modularidade e facilitando a composição de testes unitários eleva radicalmente seu score.",
            trend: true
          }
        ];
      } else if (category === "Negócios" || category === "Product") {
        insightsList = [
          {
            title: "Descoberta Baseada em Dados (Product Discovery)",
            description: "Em entrevistas de PM, estruture suas respostas unindo metas de negócio quantitativas (churn, ARR) a dados qualitativos obtidos com clientes.",
            trend: true
          },
          {
            title: "Uso de Frameworks de Priorização",
            description: "Domine o uso articulado de matrizes de valor contra esforço, RICE ou MoSCoW para embasar a gerência de escopo de forma lógica.",
            trend: false
          },
          {
            title: "Alinhamento com Engenharia e Design",
            description: "Destaque suas habilidades de liderança por influência, explicando como atua para destravar gargalos de entrega comunicando metas claras.",
            trend: true
          }
        ];
      } else if (category === "Design") {
        insightsList = [
          {
            title: "Design Systems Escaláveis",
            description: "Articule como projeta interfaces reutilizáveis baseadas em padrões atômicos e tokens para assegurar coesão em multi-produtos.",
            trend: true
          },
          {
            title: "Acessibilidade Universal (WCAG)",
            description: "Demonstrar compromisso com contraste visual, leitor de tela e suporte a navegação via teclado demonstra altíssimo profissionalismo.",
            trend: true
          },
          {
            title: "User Experience Research (Feedback)",
            description: "Sempre embase seus mockups em estudos comportamentais. Comente as descobertas de testes de usabilidade e heatmaps que guiaram a interface.",
            trend: false
          }
        ];
      } else if (category === "Contabilidade") {
        insightsList = [
          {
            title: "Fechamento Contábil & IFRS/CPC",
            description: "Demonstre domínio prático em pronunciamentos técnicos modernos e automação de conciliação financeira complexa.",
            trend: false
          },
          {
            title: "Compliance Fiscal & Inteligência Tributária",
            description: "Explique como gerenciar obrigações acessórias minimizando gargalos de auditoria e promovendo elisão fiscal legal.",
            trend: true
          },
          {
            title: "Contabilidade de Custos e Orçamentos",
            description: "Mencione sua habilidade em ler faturamentos para desenhar projeções inteligentes e orçamentos baseados em dados históricos.",
            trend: true
          }
        ];
      } else if (category === "Telecomunicações") {
        insightsList = [
          {
            title: "Otimização de Redes e Banda Larga",
            description: "Destaque seus conhecimentos em arquiteturas de fibra óptica, roteamento IP avançado e gestão de satélites ou RF.",
            trend: false
          },
          {
            title: "Implantação de Tecnologia 5G/LTE",
            description: "Mencione sua experiência com rádio frequência, QoS, fatiamento de rede (network slicing) e latência reduzida.",
            trend: true
          },
          {
            title: "Segurança de Telecom e Criptografia",
            description: "Prepare-se para explicar táticas de monitoramento de tráfego malicioso e firewalls de borda para redes de alta escala.",
            trend: true
          }
        ];
      } else if (category === "Enfermagem" || category === "Infermagem") {
        insightsList = [
          {
            title: "Triagem Eficiente & Protocolo de Manchester",
            description: "Explique sua agilidade em categorizar rapidamente a gravidade de pacientes assegurando a sobrevivência sob alto fluxo.",
            trend: false
          },
          {
            title: "Prontuário Eletrônico & Gestão de Dados",
            description: "Comente sua familiaridade com documentação rigorosa e segurança farmacológica de medicamentos em sistemas digitais.",
            trend: true
          },
          {
            title: "Atendimento Humanizado & Biossegurança",
            description: "Mostre de que forma equilibra acolhimento emocional com controle estrito de infecção hospitalar em ambientes de UTI ou enfermaria.",
            trend: true
          }
        ];
      } else {
        // Marketing / Performance
        insightsList = [
          {
            title: "Atribuição Omnicanal Baseada em Atrito",
            description: "Entrevistadores valorizam profissionais de marketing que entendem como rastrear e mensurar a jornada do cliente integrada (CRM e Ads).",
            trend: true
          },
          {
            title: "Obsessão por ROI, LTV e CAC",
            description: "Traga os resultados financeiros de suas campanhas anteriores de forma tangível em vez de priorizar métricas de engajamento puras.",
            trend: false
          },
          {
            title: "Geração de Conteúdo Potencializada por IA",
            description: "Otimizar fluxos criativos de escala e copywriting através do prompt engineering de ponta mantendo autoridade SEO é altamente demandado.",
            trend: true
          }
        ];
      }
    }

    res.json({ insights: insightsList, isRateLimited });
  } catch (error: any) {
    console.error("Error in /api/insights:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// --- ROUTED INTERVIEW PROMPTS AND SERVICES ENDPOINTS ---
app.use(interviewRouter);

// Configure Vite integration for dev server or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, watch: {ignored: ['**/db.json']} },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  });
}

startServer();

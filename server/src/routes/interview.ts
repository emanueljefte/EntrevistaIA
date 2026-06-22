import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { getSystemPrompt } from "../prompts/systemPrompt";
import { getCvAnalysisPrompt } from "../prompts/cvAnalysis";
import { getGenerateQuestionsPrompt } from "../prompts/generateQuestions";
import { getEvaluatePrompt } from "../prompts/evaluate";
import { getNextTurnPrompt } from "../prompts/followUp";

const router = express.Router();

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

function isExplicit429(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429) return true;
  
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("limit exceeded") ||
    msg.includes("rate_limit") ||
    msg.includes("too many requests")
  );
}

function isExplicit503(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 503) return true;
  
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("temporary") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded")
  );
}

// Wrapper to perform API calls with exponential backoff retries and sibling model fallback
async function generateContentWithRetryAndFallback(
  ai: any,
  params: any,
  retries = 3,
  initialDelayMs = 4000
) {
  let lastError: any = null;

  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  for (const model of modelsToTry) {
    params.model = model;
    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt < retries) {
      try {
        console.log(`[Gemini Request] Model ${model}, attempt ${attempt + 1}...`);
        const response = await ai.models.generateContent(params);
        (response as any).actualModelUsed = model;
        return response;
      } catch (error: any) {
        lastError = error;
        attempt++;
        
        // Se o erro já for um 429, não tenta de novo sob este modelo. Pula para o fallback.
        if (isExplicit429(error)) {
          console.warn(`[Gemini 429] Rate limit/quota exceeded for model ${model}. Moving to fallback model/offline immediately without retries.`);
          break;
        }

        // Se for um erro do tipo 503 (serviço fora/sobrecarregado), mantém com backoff aumentado
        const isTemporary = isExplicit503(error);
        if (!isTemporary) {
          console.error(`[Gemini Error] Non-retryable error/fatal under model ${model}:`, error.message || error);
          break; 
        }

        if (attempt >= retries) {
          console.warn(`[Gemini Error] Exhausted ${retries} attempts for model ${model}. Error:`, error.message || error);
          break; 
        }

        console.warn(`[Gemini Retry] Temporary 503 hit for ${model}. Retrying in ${delay}ms to let quota breathe... (Attempt ${attempt}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; 
      }
    }
  }

  throw lastError;
}

function extractVacancyTitle(jobRequirements?: string, fallbackField?: string, fallbackLevel?: string): string {
  const fallback = `${fallbackField || "Profissional"} ${fallbackLevel || "Pleno"}`;
  
  if (!jobRequirements || !jobRequirements.trim()) {
    return fallback;
  }

  // 1. Limpeza inicial de quebras de linha e padronização de espaços
  const lines = jobRequirements.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return fallback;

  // 2. CAPTURA DIRETA (Prefixos explícitos no início ou meio da linha)
  // Adicionado suporte a "about the job", "vaga para", "posição de", etc.
  const directPrefixRegex = /(?:vaga|cargo|vaga alvo|oportunidade|posição|prowork|título|job|about the job)\s*[-:]+\s*(.+)/i;
  for (const line of lines) {
    const match = line.match(directPrefixRegex);
    if (match && match[1]?.trim().length > 3) {
      const cleaned = cleanTitle(match[1]);
      if (isValidTitle(cleaned)) return cleaned;
    }
  }

  // 3. CAPTURA POR PROXIMIDADE DE GATILHOS (Substitui a antiga Regex problemática)
  // Procura palavras que antecedem o cargo e captura as palavras seguintes
  const fullTextClean = jobRequirements.replace(/\s+/g, ' ');
  const triggers = [
    "recrutar um", "recrutar uma", "buscar um", "buscar uma", "procura de um", 
    "procura de uma", "contratando", "vaga para", "oportunidade para", "posição de"
  ];

  for (const trigger of triggers) {
    const lowerText = fullTextClean.toLowerCase();
    const triggerIndex = lowerText.indexOf(trigger);
    
    if (triggerIndex !== -1) {
      // Pega o fragmento de texto logo após o gatilho (até 60 caracteres)
      const startOfTitle = triggerIndex + trigger.length;
      const fragment = fullTextClean.substring(startOfTitle, startOfTitle + 60).trim();
      
      // Isola até encontrar uma preposição de local/parada ou pontuação (ex: "para", "em", "com", "(", ",")
      // Isso evita capturar "Analista de Negócio para reforçar a nossa equipa..."
      const cleanFragment = fragment.split(/(?:\s+para\s+|\s+em\s+|\s+com\s+|[\(,\.\-\/])/i)[0].trim();
      
      if (cleanFragment.length > 3 && isValidTitle(cleanFragment)) {
        return cleanTitle(cleanFragment);
      }
    }
  }

  // 4. CAPTURA POR DICIONÁRIO DE PALAVRAS-CHAVE DO MERCADO
  const marketRoles = [
    'analista de negócio', 'analista de negócios', 'business analyst',
    'engenheiro de software', 'developer', 'desenvolvedor', 'programador',
    'product manager', 'pm', 'product owner', 'po', 'designer', 'ux', 'ui',
    'analista', 'especialista', 'enfermeiro', 'médico', 'técnico', 'controller',
    'contador', 'gerente', 'coordenador', 'lead', 'tech lead'
  ];

  for (const role of marketRoles) {
    if (fullTextClean.toLowerCase().includes(role)) {
      // Retorna o nome do cargo formatado bonitinho do dicionário
      return role.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  }

  // 5. HEURÍSTICA DE SEGURANÇA (Se a primeira linha for curta e não for um título genérico)
  const firstLine = lines[0];
  if (firstLine.length < 50 && isValidTitle(firstLine)) {
    return cleanTitle(firstLine);
  }

  return fallback;
}

// Valida se o título extraído não é uma palavra quebrada ou um termo genérico inválido
function isValidTitle(title: string): boolean {
  const lower = title.toLowerCase().trim();
  const blackList = ["equipa", "uipa", "empresa", "reforçar", "nossa", "m/f", "vaga", "requisitos"];
  
  if (title.length <= 3) return false;
  if (blackList.some(badWord => lower === badWord || lower.startsWith(badWord))) return false;
  
  return true;
}

// Limpa caracteres especiais, espaços duplicados e termos de gênero como (m/f)
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[\(\[]\s*m\s*\/\s*f\s*[\)\]]/i, '') // Remove (m/f) ou [m/f]
    .replace(/^[-*#•\s\d.]+\s*/, '') // Remove marcadores
    .replace(/[\(\[\{].*?[\)\]\}]/g, '') // Remove outros parênteses
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

// Helper to extract candidate role dynamically from CV content for realistic classification
function extractCandidateRole(cvText?: string, fallbackField?: string, fallbackLevel?: string): string {
  if (!cvText || cvText.trim().length === 0) {
    return `${fallbackField || "Candidato"} (${fallbackLevel || "Pleno"})`;
  }

  const cvNormalized = cvText.toLowerCase();

  const roles = [
    { name: "Enfermeiro(a) Geral", keywords: ["enfermagem", "enfermeira", "enfermeiro", "triagem", "coren"] },
    { name: "Técnico(a) de Enfermagem", keywords: ["técnico de enfermagem", "tecnico de enfermagem", "auxiliar de enfermagem"] },
    { name: "Desenvolvedor(a) Full Stack", keywords: ["full stack", "fullstack", "desenvolvedor full"] },
    { name: "Desenvolvedor(a) Front End", keywords: ["frontend", "front-end", "desenvolvedor front"] },
    { name: "Desenvolvedor(a) Back End", keywords: ["backend", "back-end", "desenvolvedor back"] },
    { name: "Engenheiro(a) de Software", keywords: ["engenheiro de software", "software engineer", "programador", "desenvolvedor javascript", "desenvolvedor typescript"] },
    { name: "Product Manager (PM)", keywords: ["product manager", "gerente de produto", "pm", "product owner", "po"] },
    { name: "UI/UX Designer", keywords: ["ui/ux", "designer ux", "designer ui", "figma", "designer de produto", "product designer"] },
    { name: "Designer Gráfico", keywords: ["designer gráfico", "designer grafico", "comunicação visual", "photoshop", "illustrator"] },
    { name: "Especialista em Marketing", keywords: ["marketing", "tráfego pago", "performance", "seo", "branding", "growth"] },
    { name: "Analista Contábil / Fiscal", keywords: ["contabilidade", "fiscal", "contábil", "contabil", "auditor", "conciliação"] },
    { name: "Engenheiro(a) de Telecomunicações", keywords: ["telecomunicações", "telecom", "redes", "radiofrequência"] },
  ];

  for (const r of roles) {
    for (const kw of r.keywords) {
      if (cvNormalized.includes(kw)) {
        return r.name;
      }
    }
  }

  const lines = cvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    const candidateName = lines[0];
    if (candidateName.length < 30 && lines.length > 1) {
      const fieldLine = lines[1];
      if (fieldLine.length < 40 && !fieldLine.includes("@") && !fieldLine.includes("http")) {
        return fieldLine;
      }
    }
  }

  return `${fallbackField || "Profissional"} (${fallbackLevel || "Pleno"})`;
}

// Helper to determine if jobRequirements is a custom user-defined text
function isCustomJobRequirements(jobRequirements?: string, field?: string, lvl?: string): boolean {
  if (!jobRequirements || !jobRequirements.trim()) return false;
  
  const cleanStr = (s: string) => s.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim().toLowerCase();

  const getStandardDefault = (f: string, l: string): string => {
    switch (f) {
      case "Tech":
        return `Vaga: Engenheiro de Software ${l}\nRequisitos:\n- Desenvolvimento de aplicações robustas e escaláveis\n- Forte conhecimento em TypeScript, React, APIs RESTful\n- Experiência prática na metodologia STAR e em otimização de performance técnica de sistemas\n- Boas práticas de arquitetura de software e testes`;
      case "Negócios":
        return `Vaga: Product Manager ${l}\nRequisitos:\n- Gestão do ciclo de vida de produtos digitais, métricas e OKRs\n- Experiência em Product Discovery e validação de hipóteses com usuários\n- Excelente comunicação para facilitação de alinhamentos e tomadas de decisão\n- Priorização estratégica de backlogs e roadmap`;
      case "Design":
        return `Vaga: UI/UX Designer ${l}\nRequisitos:\n- Criação de wireframes, fluxos de usuários e protótipos em alta fidelidade no Figma\n- Domínio de Design Systems escaláveis e consistência visual\n- Condução de pesquisas qualitativas e testes de usabilidade com usuários de verdade\n- Foco em acessibilidade digital e design responsivo`;
      case "Marketing":
        return `Vaga: Especialista de Marketing / Performance ${l}\nRequisitos:\n- Gestão e otimização de campanhas de tráfego pago (Meta Ads, Google Ads)\n- Análise aprofundada de funil de conversão, CAC, LTV e ROI de campanhas\n- SEO (Search Engine Optimization) e produção técnica de conteúdos estratégicos\n- Testes A/B e tomada de decisões baseada estritamente em analytics`;
      case "Contabilidade":
        return `Vaga: Analista de Contabilidade / Controller ${l}\nRequisitos:\n- Conciliação contábil e fiscal de alta complexidade\n- Domínio prático em normas CPC / IFRS\n- Fechamento de balancetes mensais e elaboração de relatórios gerenciais e DRE\n- Atuação pragmática frente a auditorias internas e externas`;
      case "Telecomunicações":
        return `Vaga: Engenheiro de Telecomunicações ${l}\nRequisitos:\n- Conhecimento em radiofrequência, propagação e enlaces de transmissão óptica/rádio\n- Configuração de QoS (Quality of Service), monitoramento de telemetria e Engenharia de Tráfego\n- Diagnóstico avançado de latência, jitter, perda de pacotes e contingenciamento de rede\n- Familiaridade com tecnologias móveis como 5G e LTE`;
      case "Enfermagem":
        return `Vaga: Enfermeiro ${l}\nRequisitos:\n- Triagem clínica de pacientes e protocolo de Manchester sob alto fluxo hospitalar\n- Controle rigoroso de biossegurança e prevenção de infecção hospitalar\n- Gestão de prontuários eletrônicos e administração segura de farmacológicos\n- Atenção à saúde humanizada integrada com as diretivas do Coren`;
      default:
        return "";
    }
  };

  const stdDefault = getStandardDefault(field || "", lvl || "");
  if (!stdDefault) return true;
  
  // Also check alternative Enfermagem format mapping from SetupPage
  if (field === "Enfermagem") {
    const altDefault = `Vaga: Enfermeiro ${lvl}\nRequisitos:\n- Triagem clínica de pacientes e protocolo de Manchester sob alto fluxo hospitalar\n- Controle rigoroso de biossegurança e prevenção de infecção hospitalar\n- Gestão de prontuários eletrônicos e administração segura de farmacológicos\n- Prática de atendimento humanizado, empático e acolhedor a familiares e pacientes`;
    if (cleanStr(altDefault) === cleanStr(jobRequirements)) {
      return false;
    }
  }

  return cleanStr(stdDefault) !== cleanStr(jobRequirements);

}

// Helper to check profile compatibility/inconsistency including job requirements specification
function checkProfileMismatch(field: string, cvText: string, jobRequirements?: string): boolean {
  if (!cvText) return false;
  const lowerField = (field || "").toLowerCase();
  const lowerCv = cvText.toLowerCase();
  const lowerReqs = (jobRequirements || "").toLowerCase();

  const techKeywords = ["programador", "desenvolvedor", "software", "tecnologia", "developer", "frontend", "backend", "fullstack", "computação", "coding", "algorithm", "database", "git", "github", "apis", "typescript", "react", "node", "python", "java", "c#", "desenvolvimento de", "programação"];
  const healthKeywords = ["enfermagem", "enfermeira", "enfermeiro", "medicina", "médico", "médica", "saúde", "hospitalar", "clínica", "paciente", "ambulatório", "nutricionista", "odontologia", "nurse", "hospital", "patient", "clinical", "nursing", "triagem", "biossegurança", "infecção", "prontuário", "farmacológico", "manchester", "médicos", "pacientes", "psicologia", "terapeuta", "clínico", "clinica"];
  const designKeywords = ["designer", "design", "figma", "gráfico", "illustrator", "photoshop", "ux", "ui", "identidade visual", "design system", "wireframe", "protótipo", "layout", "venda visual", "interfaces", "usabilidade", "user experience", "comunicação visual"];
  const marketingKeywords = ["marketing", "ads", "seo", "branding", "comunicação", "campanhas", "copywriter", "vendas", "social media", "tráfego pago", "conversão", "cac", "ltv", "roi", "adwords", "google ads", "copywriting", "funil", "growth"];
  const accountingKeywords = ["contabilidade", "fiscal", "cpc", "ifrs", "balancetes", "auditoria", "controller", "tributário", "contábil", "finanças", "gerenciais", "dre", "balanço", "faturamento", "analista financeiro", "conciliação"];
  const telecomKeywords = ["telecomunicações", "redes", "radiofrequência", "enlaces", "5g", "lte", "qos", "jitter", "latência", "banda larga", "roteadores", "switches", "antena", "telefonia", "roteamento"];

  let isHealth = false;
  let isTech = false;
  let isDesign = false;
  let isMarketing = false;
  let isAccounting = false;
  let isTelecom = false;

  const isCustom = isCustomJobRequirements(jobRequirements, field, "Júnior") || isCustomJobRequirements(jobRequirements, field, "Pleno") || isCustomJobRequirements(jobRequirements, field, "Sênior");

  if (isCustom && lowerReqs) {
    // Determine dynamic target domain strictly from jobRequirements text for custom vacancy, ignoring simple field select
    isHealth = lowerReqs.includes("enfermagem") || lowerReqs.includes("saúde") || lowerReqs.includes("hospitalar") || lowerReqs.includes("paciente") || lowerReqs.includes("clínica") || lowerReqs.includes("médic") || lowerReqs.includes("enfermei");
    isTech = lowerReqs.includes("programador") || lowerReqs.includes("desenvolvedor") || lowerReqs.includes("software") || lowerReqs.includes("typescript") || lowerReqs.includes("react") || lowerReqs.includes("programação") || lowerReqs.includes("código") || lowerReqs.includes("desenvolvimento");
    isDesign = lowerReqs.includes("designer") || lowerReqs.includes("figma") || lowerReqs.includes("ux/") || lowerReqs.includes("wireframe") || lowerReqs.includes("protótip") || lowerReqs.includes("projeto visual") || lowerReqs.includes("diagramador");
    isMarketing = lowerReqs.includes("tráfego pago") || lowerReqs.includes("campanhas") || lowerReqs.includes("seo") || lowerReqs.includes("google ads") || lowerReqs.includes("social media") || lowerReqs.includes("copywriter") || lowerReqs.includes("marketing");
    isAccounting = lowerReqs.includes("balancete") || lowerReqs.includes("contabilidade") || lowerReqs.includes("dre") || lowerReqs.includes("conciliação") || lowerReqs.includes("tributário") || lowerReqs.includes("fiscal") || lowerReqs.includes("contábil");
    isTelecom = lowerReqs.includes("radiofrequência") || lowerReqs.includes("telecomunicações") || lowerReqs.includes("5g") || lowerReqs.includes("enlaces") || lowerReqs.includes("roteadores") || lowerReqs.includes("telecom");
  } else {
    // Fall back to form field OR jobRequirements
    isHealth = lowerField.includes("enferm") || lowerField.includes("saude") || lowerField.includes("saúde") || lowerField.includes("médic") || lowerField.includes("hospital") || lowerField.includes("nurse") || lowerField.includes("nursing") ||
                      lowerReqs.includes("enfermagem") || lowerReqs.includes("saúde") || lowerReqs.includes("hospitalar") || lowerReqs.includes("paciente") || lowerReqs.includes("clínica") || lowerReqs.includes("médic") || lowerReqs.includes("enfermei");

    isTech = lowerField.includes("tecnologia") || lowerField.includes("desenvol") || lowerField.includes("software") || lowerField.includes("coder") || lowerField.includes("developer") || lowerField.includes("ti") || lowerField.includes("computa") || lowerField.includes("it") || lowerField.includes("tech") ||
                  lowerReqs.includes("programador") || lowerReqs.includes("desenvolvedor") || lowerReqs.includes("software") || lowerReqs.includes("typescript") || lowerReqs.includes("react") || lowerReqs.includes("programação") || lowerReqs.includes("código");

    isDesign = lowerField.includes("design") || lowerField.includes("ux") || lowerField.includes("ui") || lowerField.includes("gráfico") ||
                    lowerReqs.includes("designer") || lowerReqs.includes("figma") || lowerReqs.includes("ux/") || lowerReqs.includes("wireframe") || lowerReqs.includes("protótip") || lowerReqs.includes("projeto visual");

    isMarketing = lowerField.includes("marketing") || lowerField.includes("ads") || lowerField.includes("performance") ||
                      lowerReqs.includes("tráfego pago") || lowerReqs.includes("campanhas") || lowerReqs.includes("seo") || lowerReqs.includes("google ads") || lowerReqs.includes("social media");

    isAccounting = lowerField.includes("contab") || lowerField.includes("fiscal") || lowerField.includes("auditor") || lowerField.includes("control") ||
                        lowerReqs.includes("balancete") || lowerReqs.includes("contabilidade") || lowerReqs.includes("dre") || lowerReqs.includes("conciliação") || lowerReqs.includes("tributário");

    isTelecom = lowerField.includes("telecom") || lowerField.includes("redes") || lowerField.includes("antena") ||
                    lowerReqs.includes("radiofrequência") || lowerReqs.includes("telecomunicações") || lowerReqs.includes("5g") || lowerReqs.includes("enlaces") || lowerReqs.includes("roteadores");
  }

  // Candidate CV presence
  const hasHealthCv = healthKeywords.some(kw => lowerCv.includes(kw));
  const hasTechCv = techKeywords.some(kw => lowerCv.includes(kw));
  const hasDesignCv = designKeywords.some(kw => lowerCv.includes(kw));
  const hasMarketingCv = marketingKeywords.some(kw => lowerCv.includes(kw));
  const hasAccountingCv = accountingKeywords.some(kw => lowerCv.includes(kw));
  const hasTelecomCv = telecomKeywords.some(kw => lowerCv.includes(kw));

  // If there's a strong contradiction between the target domain of the vacancy/specification and what's on the CV:
  if (isHealth && !hasHealthCv && (hasTechCv || hasDesignCv || hasMarketingCv || hasAccountingCv || hasTelecomCv)) {
    return true; 
  }
  if (isTech && !hasTechCv && (hasHealthCv || hasAccountingCv || hasTelecomCv)) {
    return true; 
  }
  if (isDesign && !hasDesignCv && (hasHealthCv || hasAccountingCv || hasTelecomCv)) {
    return true; 
  }
  if (isAccounting && !hasAccountingCv && (hasHealthCv || hasDesignCv || hasMarketingCv || hasTelecomCv)) {
    return true; 
  }
  if (isTelecom && !hasTelecomCv && (hasHealthCv || hasAccountingCv || hasDesignCv || hasMarketingCv)) {
    return true; 
  }

  // Check specific requirements explicitly mentioned in jobRequirements (if they look like required tool keywords)
  if (lowerReqs.length > 20) {
    const requiredTechs = ["figma", "typescript", "react", "enfermagem", "coas", "coren", "médico", "telecomunicações", "contabilidade", "cpc", "ifrs"];
    for (const tech of requiredTechs) {
      if (lowerReqs.includes(tech)) {
        if (tech === "enfermagem" && !hasHealthCv && (hasTechCv || hasDesignCv || hasMarketingCv || hasAccountingCv)) {
          return true;
        }
        if ((tech === "typescript" || tech === "react") && !hasTechCv && hasHealthCv) {
          return true;
        }
        if (tech === "figma" && !hasDesignCv && hasHealthCv) {
          return true;
        }
        if (tech === "contabilidade" && !hasAccountingCv && (hasHealthCv || hasTelecomCv || hasDesignCv)) {
          return true;
        }
      }
    }
  }

  return false;
}

function logQuietGeminiError(apiName: string, error: any) {
  const msg = error?.message || String(error);
  if (msg.includes("429") || msg.includes("RESOURCE_REHAUSTED") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    console.log(`[Gemini Rate Limit] ${apiName}: Quota limit reached on free tier. Seamlessly fell back to local high-fidelity simulation engine.`);
  } else {
    console.log(`[Gemini Error] ${apiName}: Using local fallback. Detail: ${msg}`);
  }
}

// ==========================================
// PREMIUM LOCAL OFFLINE FALLBACK GENERATORS
// ==========================================

function getFallbackCvAnalysis(cvText: string, field: string, level: string, language: string, jobRequirements?: string) {
  const isEnglish = language === "Inglês" || language?.toLowerCase().startsWith("en");
  const keywordsFound: string[] = [];
  const techKeywords = ["react", "node", "typescript", "javascript", "python", "aws", "docker", "kubernetes", "sql", "postgres", "django", "java", "spring"];
  const designKeywords = ["figma", "ux", "ui", "photoshop", "illustrator", "sketch", "wireframe", "prototype", "design system", "usabilidade"];
  const productKeywords = ["agile", "scrum", "product manager", "priorização", "roadmap", "backlog", "metrics", "kpi", "okr"];
  const marketingKeywords = ["seo", "cac", "roi", "adwords", "google ads", "branding", "copywriting", "social media", "crm", "funil"];
  
  let listToSearch = techKeywords;
  if (field?.toLowerCase().includes("design")) listToSearch = designKeywords;
  else if (field?.toLowerCase().includes("product") || field?.toLowerCase().includes("neg") || field?.toLowerCase().includes("gest")) listToSearch = productKeywords;
  else if (field?.toLowerCase().includes("market") || field?.toLowerCase().includes("comunic")) listToSearch = marketingKeywords;
  else listToSearch = [...techKeywords, ...designKeywords, ...productKeywords, ...marketingKeywords];

  const lowerCv = (cvText || "").toLowerCase();
  listToSearch.forEach(kw => {
    if (lowerCv.includes(kw)) {
      keywordsFound.push(kw.toUpperCase());
    }
  });

  const isMismapped = checkProfileMismatch(field, cvText, jobRequirements);

  const overallScore = isMismapped 
    ? 12 
    : Math.min(95, Math.max(68, 75 + keywordsFound.length * 2 + (level === "Sênior" ? 5 : 0)));
  
  const strengths = isMismapped
    ? (isEnglish 
        ? ["Basic chronological clarity of the submitted career sequence.", "Some structured task descriptions in the resume."] 
        : ["Clareza cronológica básica no histórico profissional enviado.", "Presença de descrições estruturadas das tarefas realizadas."])
    : (isEnglish ? [
        `Clear structural alignment with ${field} professional standards.`,
        keywordsFound.length > 0 ? `Demonstrated familiarity with critical tools/skills: ${keywordsFound.join(", ")}.` : "Solid description of professional achievements and work history.",
        `Relevant academic or practical background aligned with ${level} level requirements.`
      ] : [
        `Alinhamento estrutural refinado com as melhores práticas para a área de ${field}.`,
        keywordsFound.length > 0 ? `Domínio documentado em ferramentas fundamentais como: ${keywordsFound.join(", ")}.` : "Descrição consistente de realizações profissionais e projetos anteriores.",
        `Adequação do perfil técnico e comportamental compatível com o nível ${level}.`
      ]);

  const areasToImprove = isMismapped
    ? (isEnglish
        ? ["Acquire and certify foundational domain knowledge.", "Align professional trajectory with the requirements.", "Rebuild the profile summary to match the field."]
        : ["Adquirir e certificar conhecimentos fundamentais na área desejada.", "Alinhar o histórico de cargos com as funções exigidas pela vaga.", "Reestruturar o resumo profissional para refletir objetivos coerentes com a vaga de destino."])
    : (isEnglish ? [
        "Quantify your impacts by adding hard metrics (ROI, conversion, volume parsed, performance multipliers).",
        "Tailor your profile summary to sound more direct, focusing on strategic contributions rather than general tasks.",
        "Detail your direct leadership, ownership, or critical problem-solving scenarios for starch feedback."
      ] : [
        "Quantificar conquistas anteriores especificando métricas concretas (ex: melhorias percentuais, eficiência, redução de custos na empresa).",
        "Tornar o resumo profissional mais direto, focando na proposta de valor estratégico e domínio do seu segmento.",
        "Aprofundar a descrição de decisões críticas de design, código ou de negócios que liderou individualmente."
      ]);

  const generalAssessment = isMismapped
    ? (isEnglish
        ? `Dra. Ana Martins' Analysis (Fallback Mode): WARNING - Candidate Profile Mismatch. Your CV and background are focused on a completely different field than the target role of ${field}. A complete mismatch of professional domains was detected.`
        : `Análise da Dra. Ana Martins (Modo de Contingência): ATENÇÃO - Incompatibilidade de Perfil. Foi detectada uma desconexão total entre o perfil do seu currículo e a área mínima exigida de atuação da vaga de ${field}. Recomendamos reavaliar sua candidatura para assegurar alinhamento técnico.`)
    : (isEnglish
        ? `Dr. Ana Martins' Analysis (Fallback Mode): The provided CV is structured well for a ${level} position in ${field}. Your resume has clear foundations. Adding quantitative evidence of performance will elevate its technical resonance.`
        : `Análise da Dra. Ana Martins (Modo de Contingência): O currículo apresentado está estruturado com clareza para a área de ${field} (perfil ${level}). O documento evidencia boas fundamentações técnicas. A incorporação de conquistas numéricas será o diferencial para elevar seu nível de competitividade.`);

  const recommendation = isMismapped
    ? (isEnglish
        ? "We strongly advise targeting roles compatible with your background, or acquiring formal training in healthcare/domain."
        : "Recomendamos buscar vagas compatíveis com sua área de atuação ou realizar cursos e transição formal de carreira.")
    : (isEnglish
        ? "Elevate professional highlights with concrete business KPI results and structural action words."
        : "Estruture o resumo inicial utilizando verbos de ação focados em impacto e adicione métricas de sucesso aos projetos.");

  const isCustom = isCustomJobRequirements(jobRequirements, field, level);
  const identifiedVacancy = isCustom 
    ? extractVacancyTitle(jobRequirements, field, level) 
    : `${field} ${level}`;
  
  const identifiedCandidateRole = isMismapped 
    ? "Perfil Diferenciado / Outra Trajetória" 
    : extractCandidateRole(cvText, field, level);

  return {
    overallScore,
    generalAssessment,
    strengths: strengths.slice(0, 3),
    areasToImprove: areasToImprove.slice(0, 3),
    recommendation,
    identifiedVacancy,
    identifiedCandidateRole,
    convergentPoints: isMismapped
      ? (isEnglish ? ["Demonstration of initiative and motivation to shift focus."] : ["Demonstração de iniciativa e motivação para novas áreas de atuação."])
      : (isEnglish
          ? [`General alignment with core challenges of ${field}.`, `Demonstrated familiarity with expectations for ${level} roles.`]
          : [`Alinhamento geral com os desafios de rotina em ${field}.`, `Familiaridade demonstrada com as responsabilidades de nível ${level}.`]),
    divergentPoints: isMismapped
      ? (isEnglish
          ? ["Total discrepancy between professional history and requirements.", "Missing mandatory credentials or certifications for the target role."]
          : ["Incompatibilidade direta de portfólio estruturado e histórico de cargos.", "Ausência de credenciais ou licenças profissionais obrigatórias recomendadas para a vaga."])
      : (isEnglish
          ? ["Lack of standardized STAR methodology indicators in the CV.", "Specific tools or auxiliary frameworks requested by the vacancy but not stated in text."]
          : ["Ausência de indicadores estruturais no método STAR para comprovação de dados.", "Ferramentas ou frameworks secundários solicitados na vaga que não constam textualmente no CV."]),
    competencies: {
      communication: Math.min(100, Math.max(40, overallScore + 5)),
      technical: isMismapped ? 10 : Math.min(100, Math.max(45, overallScore + (keywordsFound.length > 1 ? 8 : -4))),
      problemSolving: Math.min(100, Math.max(40, overallScore + 2)),
      experienceMatch: isMismapped ? 10 : Math.min(100, Math.max(35, overallScore + (level === "Sênior" ? 6 : -3))),
      focusResults: Math.min(100, Math.max(40, overallScore + 1))
    }
  };
}

function getFallbackQuestions(field: string, level: string, language: string, cvText: string): string[] {
  const isEnglish = language === "Inglês" || language?.toLowerCase().startsWith("en");
  
  // Extract custom reference if possible to inject into queries
  let customProj = isEnglish ? "your recent projects" : "seus projetos mais recentes";
  const lowerCv = (cvText || "").toLowerCase();
  
  if (lowerCv.includes("react")) customProj = "React";
  else if (lowerCv.includes("figma")) customProj = "Figma";
  else if (lowerCv.includes("django") || lowerCv.includes("python")) customProj = "Python/Django";
  else if (lowerCv.includes("spring") || lowerCv.includes("java")) customProj = "Java/Spring Boot";
  else if (lowerCv.includes("aws")) customProj = "Amazon Web Services (AWS)";
  else if (lowerCv.includes("seo") || lowerCv.includes("ads")) customProj = "Marketing Analytics/Ads";
  
  if (field?.toLowerCase().includes("design")) {
    if (isEnglish) {
      return [
        `Could you describe your standard UX design workflow and how you gather early requirements?`,
        `Given a complex design sprint, how do you validate your design decisions with actual users?`,
        `Regarding your experience, how do you handle cross-functional alignment when developers challenge your ${customProj} specs?`,
        `How do you design for scale utilizing micro-components and design systems rather than static grids?`,
        `Describe a scenario where user feedback conflicted heavily with business requirements and how you negotiated the resolution.`,
        `Can you share your perspective on accessibility (WCAG) and how you integrate it naturally into your visuals?`,
        `Where do you see design trends heading in 2026, and how will you adapt your personal creative processes?`
      ];
    } else {
      return [
        `Como estruturar o seu fluxo de design UX/UI, desde a pesquisa inicial até a entrega de artefatos finais de alta fidelidade?`,
        `Ao desenhar uma interface de alta complexidade, como você valida a usabilidade das suas decisões com usuários reais?`,
        `Com base na sua experiência em ${customProj}, como você garante a consistência técnica ao alinhar escopo de código com desenvolvedores?`,
        `Como você aborda a estruturação de um Design System escalável e reutilizável ao invés de protótipos estáticos isolados?`,
        `Descreva uma situação real de projeto onde o feedback de usabilidade de clientes entrou em conflito direto com as metas do negócio.`,
        `Qual o seu comprometimento com acessibilidade digital (WCAG) e de que forma você audita interfaces no seu dia a dia?`,
        `Como você avalia as tendências para design e design generativo de interface planejando os próximos passos de sua carreira?`
      ];
    }
  } else if (field?.toLowerCase().includes("product") || field?.toLowerCase().includes("neg") || field?.toLowerCase().includes("gest")) {
    if (isEnglish) {
      return [
        `How do you define a product vision and align stakeholders holding diverging opinions?`,
        `What qualitative and quantitative criteria do you employ to prioritize a long product backlog under limited engineering hours?`,
        `Thinking of your background, could you detail how you evaluated success for product launches you previously guided?`,
        `How do you formulate a robust MVP and handle feature-creep requests from commercial sponsors?`,
        `Describe a behavioral scenario where a product release flopped or didn't meet expected KPIs, and what you learned from it.`,
        `How do you foster a truly collaborative, data-driven culture across design, QA, and software developers?`,
        `Reflecting on your journey, how do you stay competitive to ensure your product leadership remains highly impactful?`
      ];
    } else {
      return [
        `Como você estrutura as etapas de Product Discovery para identificar as reais dores dos clientes e transformá-las em metas claras?`,
        `Quais metodologias (como RICE ou ICE) você julga mais saudáveis para gerenciar e priorizar o backlog de engenharia com prazos apertados?`,
        `Considerando as vivências do seu histórico, de que forma traduziu a visão do produto em um roteiro tático (Roadmap) de sucesso?`,
        `Como você conduz o alinhamento com áreas de negócio e diretoria que demandam features fora do escopo aprovado para o MVP?`,
        `Descreva uma situação crítica em que um lançamento de produto não atingiu as metas de negócio e como agiu para mitigar as consequências.`,
        `De que modo você acompanha métricas quantitativas (churn, retenção, NPS) conectando-as à performance operacional diária?`,
        `Que tipo de liderança de influência você exerce entre os times multidisciplinares de Engenharia, Design e Marketing?`
      ];
    }
  } else if (field?.toLowerCase().includes("market") || field?.toLowerCase().includes("comunic")) {
    if (isEnglish) {
      return [
        `Could you describe your methodology for optimizing customer acquisition channels and lowering CAC?`,
        `How do you align creative marketing elements with rigorous performance analytics to boost ROI?`,
        `In reference to your background, how did you structure and organize campaign scaling under strict budgets?`,
        `How do you setup reliable multi-touch attribution tunnels to measure the real impact of content?`,
        `Tell me about a project where market trends changed rapidly and you had to pivot your core marketing campaigns.`,
        `What tools and indicators do you rely on to assess brand sentiment and organic SEO authority?`,
        `How do you plan to leverage AI and automated creation tools in your upcoming campaigns?`
      ];
    } else {
      return [
        `Quais são as suas principais estratégias para otimizar os custos de aquisição de clientes (CAC) mantendo excelente taxa de conversão?`,
        `Como você une a criatividade do branding e design com o rigor analítico da performance de tráfego pago nas suas campanhas?`,
        `Com base no seu histórico em ${customProj}, qual foi o projeto de expansão orgânica ou paga que trouxe o melhor retorno (ROI) documentado?`,
        `De que modo você planeja a atribuição multitoque para compreender quais canais realmente geram conversão qualificada de leads?`,
        `Descreva um desafio real onde o seu funil de marketing tradicional apresentou saturação repentina e como contornou o problema.`,
        `Quais métricas de vaidade você costuma ignorar para focar verdadeiramente nos indicadores financeiros saudáveis de crescimento?`,
        `Qual a sua visão sobre o futuro da inteligência artificial generativa aplicada ao SEO de conteúdo e conversão de leads?`
      ];
    }
  } else if (field?.toLowerCase().includes("contabil")) {
    if (isEnglish) {
      return [
        `Could you describe your typical balance sheet closing schedule and how you guarantee precision under tight deadlines?`,
        `How do you systematically analyze and reconcile discrepancies in complex intercompany accounts?`,
        `Thinking about your past experiences in ${customProj}, what was the most complex audit or fiscal regulation compliance issue you resolved?`,
        `How do you evaluate and optimize tax strategies to minimize company cost structures in a compliant manner?`,
        `Describe a scenario where you discovered a significant booking error after reporting or close, and how you managed the situation.`,
        `How do you present financial reports or budget analyses to non-financial executives to facilitate decision-making?`,
        `Reflecting on your accounting career, what core skills or certifications do you plan to master next to stay ahead?`
      ];
    } else {
      return [
        `Como você organiza o seu calendário fiscal de fechamento contábil mensal e quais rotinas executa para garantir precisão absoluta?`,
        `Quais práticas de conciliação você adota ao lidar com transações intercompanhias (intercompany) de alta complexidade?`,
        `Analisando sua bagagem com ${customProj}, de que forma mitigou riscos fiscais relevantes ou lidou com auditorias internas/externas desafiadoras?`,
        `Como você analisa a legislação tributária corrente para propor estratégias lícitas de elisão fiscal e otimização de custos?`,
        `Descreva um cenário real em que detectou uma inconsistência material após o fechamento do balancete e qual foi a sua atuação de correção.`,
        `De que maneira traduz demonstrativos financeiros e relatórios de DRE complexos para gestores e diretores de outras áreas não contábeis?`,
        `Mirando sua evolução profissional, quais competências avançadas ou pronunciamentos técnicos (como CPC/IFRS) pretende masterizar no curto prazo?`
      ];
    }
  } else if (field?.toLowerCase().includes("telecom")) {
    if (isEnglish) {
      return [
        `Could you detail your engineering workflow for optimizing radiofrequency coverage or high-capacity optical links?`,
        `How do you measure and troubleshoot network packet loss, high latency, or packet jitter in active transmission channels?`,
        `Given your professional path in ${customProj}, what was the most demanding network infrastructure bottleneck or telemetry incident you diagnosed?`,
        `How do you approach Quality of Service (QoS) and Traffic Engineering configurations in mixed fixed and mobile networks?`,
        `Describe a situation when a critical link went down or a major network blackout occurred, and what steps you took under pressure to restore it.`,
        `How do you negotiate and specify technical requirements when aligning plans with external vendors or cross-functional teams?`,
        `Looking ahead to next-generation technologies like 5G-Advanced or private LTE, how do you align your career training to adapt?`
      ];
    } else {
      return [
        `Quais são as suas principais abordagens de engenharia e modelagem para otimizar a propagação de radiofrequência ou enlaces de fibra óptica?`,
        `Como você diagnostica e soluciona perdas de pacotes, jitter elevado ou gargalos de latência em canais de transmissão ativos?`,
        `Considerando seu histórico técnico com ${customProj}, qual foi o incidente de rede ou gargalo de infraestrutura mais instigante que você solucionou?`,
        `Como você conduz a configuração e o planejamento de Engenharia de Tráfego e Políticas de Qualidade de Serviço (QoS) na rede?`,
        `Descreva um desafio real em que ocorreu uma queda massiva de link ou indisponibilidade crítica de rede e de que maneira agiu para restabelecer o serviço.`,
        `De que forma você apresenta e traduz especificações técnicas complexas de redes ao colaborar com fornecedores ou equipes de outras áreas?`,
        `Refletindo sobre as tecnologias de próxima geração (como 5G-Advanced, satélites ou virtualização de redes), o que planeja dominar para continuar relevante?`
      ];
    }
  } else if (field?.toLowerCase().includes("enferm") || field?.toLowerCase().includes("inferm")) {
    if (isEnglish) {
      return [
        `Could you describe your approach to clinical nursing triage and prioritizing care in high-pressure emergency environments?`,
        `How do you ensure rigid compliance with biosafety protocols and infection control measures within hospital units?`,
        `Based on your clinical experience in ${customProj}, what was the most challenging patient case or emergency scenario you managed?`,
        `How do you handle demanding shift allocations and ensure absolute patient safety when clinical resources are limited?`,
        `Describe a scenario where a patient's vital signs deteriorated suddenly under your watch, and what immediate clinical action you took.`,
        `How do you establish clear, empathetic, and humanized communication with patients and their families during sensitive times?`,
        `Looking at your future goals in healthcare, what clinical specializations or healthcare management skills are you currently focused on developing?`
      ];
    } else {
      return [
        `Como você estrutura o seu fluxo de triagem clínica de enfermagem e de quais parâmetros se vale para priorizar atendimentos sob alta pressão?`,
        `Quais práticas rígidas de biossegurança e controle de infecção hospitalar você prioriza de forma mais enfática no cuidado diário?`,
        `Apoiando-se em sua trajetória prática com ${customProj}, descreva o caso clínico ou cenário de urgência hospitalar mais desafiador em que atuou.`,
        `Como você gerencia o dimensionamento de sua carga de trabalho e assegura segurança impecável ao paciente sob restrição de equipe?`,
        `Relate um caso real em que detectou uma deterioração súbita nos sinais vitais de um paciente sob seus cuidados e as medidas imediatas aplicadas.`,
        `Como você propicia uma comunicação humanizada, clara e empática para acolher pacientes e familiares em momentos de vulnerabilidade clínica?`,
        `Pensando no seu horizonte profissional de saúde, quais especialidades clínicas ou competências de gestão em saúde planeja aprofundar amanhã?`
      ];
    }
  } else {
    // Default Tech Field
    if (isEnglish) {
      return [
        `Could you summarize your core developer stack and typical daily engineering workflows?`,
        `How do you address performance optimization, code clean-ups, and algorithmic efficiency (Big O)?`,
        `Looking at your CV technical focus on ${customProj}, what was the most complex architecture bottleneck you had to solve?`,
        `How do you design clean, robust system components with automated test coverage (TDD/E2E)?`,
        `Describe a scenario where a production deployment broke or crashed, and how you performed triage and root-cause fix.`,
        `How do you handle team differences during pull requests or code reviews back-and-forth discussions?`,
        `Where do you wish to expand your professional competencies as a seasoned tech contributor?`
      ];
    } else {
      return [
        `Como você analisa a performance do seu código e quais heurísticas adota para garantir algoritmos eficientes (tempo e espaço)?`,
        `De que maneira projeta integrações de banco de dados, estabelecendo consistência técnica, resiliência e integridade referencial?`,
        `Analisando seu percurso com ${customProj}, qual foi o maior desafio de escalabilidade ou gargalo de infraestrutura que você saneou?`,
        `Qual a sua postura em relação ao débito técnico e como aborda refatorações profundas garantindo que novas features continuem subindo?`,
        `Descreva uma situação real em que um bug grave ou queda do sistema ocorreu em produção e as medidas tomadas para resolvê-lo.`,
        `Como reage a discordâncias de arquitetura ou revisões rigorosas de código (Pull Requests) promovidas pela sua equipe técnica?`,
        `Pensando no amanhã, quais competências avançadas (como nuvem, IA ou distribuição de dados) planeja dominar para se destacar?`
      ];
    }
  }
}

function getFallbackEvaluation(chatHistory: any[], field: string, level: string, language: string, cvText: string, jobRequirements?: string) {
  const isEnglish = language === "Inglês" || language?.toLowerCase().startsWith("en");
  
  // Exclude empty spaces or basic strings in mapping answers
  const candAnswers = chatHistory
    .filter((m: any) => m.role === "candidate")
    .map((m: any) => (m.text || "").trim())
    .filter(Boolean);
  
  const skippedCount = chatHistory.filter((m: any) => m.role === "candidate" && (
    (m.text || "").includes("pulou") || 
    (m.text || "").includes("skip") || 
    (m.text || "").includes("pulada") || 
    (m.text || "").includes("skipped") || 
    !(m.text || "").trim()
  )).length;

  const answeredCount = candAnswers.length - skippedCount;

  // Low quality answers (under 5 words, excluding skipped)
  const lowQualityCount = chatHistory.filter((m: any) => {
    if (m.role !== "candidate") return false;
    const text = (m.text || "").trim();
    if (!text) return true;
    if (text.includes("pulou") || text.includes("skip") || text.includes("pulada") || text.includes("skipped") || text.includes("[Questão")) return false;
    const words = text.split(/\s+/).filter(Boolean);
    return words.length < 5;
  }).length;

  let totalLength = 0;
  let wordCount = 0;
  let hasNumbers = false;
  let collectivePronounsCount = 0; // "nós", "nosso", "fomos", "fizemos", "desenvolvemos", "entregamos", "trabalhamos"
  let individualPronounsCount = 0; // "eu", "minha", "meu", "criei", "desenvolvi", "fiz", "liderei", "resolvi"

  const collectiveWordsRegex = /\b(nós|nosso|nossa|fomos|fizemos|desenvolvemos|entregamos|trabalhamos|criamos|we|our|ours|us|went|developed|made|delivered|worked|created)\b/gi;
  const individualWordsRegex = /\b(eu|meu|minha|criei|desenvolvi|fiz|liderei|resolvi|fui|participei|i|my|mine|me|created|developed|did|led|solved|managed|was)\b/gi;
  const numberRegex = /\d+/;

  candAnswers.forEach(ans => {
    if (ans.includes("pulou") || ans.includes("skip") || ans.includes("pulada") || ans.includes("skipped")) return;
    totalLength += ans.length;
    const words = ans.split(/\s+/).filter(Boolean);
    wordCount += words.length;
    
    if (numberRegex.test(ans)) {
      hasNumbers = true;
    }

    const colM = ans.match(collectiveWordsRegex);
    if (colM) collectivePronounsCount += colM.length;

    const indM = ans.match(individualWordsRegex);
    if (indM) individualPronounsCount += indM.length;
  });
  
  const avgWords = answeredCount > 0 ? Math.round(wordCount / answeredCount) : 0;
  const totalAnswers = candAnswers.length;

  // Domain terms detection (checks if candidate mentioned domain concepts)
  const techTerms = ["api", "microservices", "docker", "react", "node", "typescript", "kubernetes", "sql", "postgres", "aws", "git", "clean", "testes"];
  const designTerms = ["figma", "ux", "ui", "design system", "componente", "wireframe", "protótipo", "pesquisa", "usabilidade", "user"];
  const businessTerms = ["product", "roadmap", "priorização", "scrum", "agile", "kpi", "okr", "churn", "conversão", "métrica"];
  const marketingTerms = ["leads", "cac", "roi", "funil", "conversão", "campanha", "seo", "anúncio", "vendas", "tráfego"];

  let domainList = techTerms;
  if (field?.toLowerCase().includes("design")) domainList = designTerms;
  else if (field?.toLowerCase().includes("product") || field?.toLowerCase().includes("neg") || field?.toLowerCase().includes("gest")) domainList = businessTerms;
  else if (field?.toLowerCase().includes("market") || field?.toLowerCase().includes("comunic")) domainList = marketingTerms;

  let matchedDomainTermsCount = 0;
  candAnswers.forEach(ans => {
    if (ans.includes("pulou") || ans.includes("skip") || ans.includes("pulada") || ans.includes("skipped")) return;
    const lowerAns = ans.toLowerCase();
    domainList.forEach(term => {
      if (lowerAns.includes(term)) matchedDomainTermsCount++;
    });
  });

  // Pillar 1: Curriculum Evaluation
  const isMismapped = checkProfileMismatch(field, cvText, jobRequirements);
  let cvScore = 65;
  if (isMismapped) {
    cvScore = 12;
  } else if (cvText && cvText.length > 50) {
    cvScore += Math.min(25, Math.round(cvText.length / 85));
    if (level === "Sênior") cvScore += 5;
  } else {
    cvScore = 40; // Empty cv text
  }
  cvScore = Math.min(97, cvScore);

  const cvAssessmentP1 = isEnglish
    ? (isMismapped ? `CAREER MISMATCH ALERT: Your background has zero compatibility with the target domain of ${field}.` : `Curriculum for ${field} (${level}) analyzed against current market trends.`)
    : (isMismapped ? `ALERTA DE DESCONEXÃO PROFISSIONAL: Foi detectada uma grave incompatibilidade entre o histórico do seu currículo e as competências exigidas para a cadeira de ${field}.` : `O currículo de nível ${level} para a área de ${field} foi analisado comparativamente com os requisitos e competências mais solicitados pelo mercado atual.`);

  const cvAssessmentP2 = isEnglish
    ? (cvText && cvText.length > 100 
       ? `The document presents structured technical highlights. Translating some tasks into STAR-based business solutions would optimize its visual density.` 
       : `The submitted document has very sparse descriptions. We suggest enriching it with concrete experiences and core tech keywords.`)
    : (cvText && cvText.length > 100 
       ? `O currículo demonstra um bom alinhamento com termos do mercado de ${field}, exibindo trajetória compatível. A inclusão de conquistas quantificáveis (métrica STAR direta) no próprio documento é a melhor recomendação para aumentar as taxas de conversão de recrutamento.` 
       : `O documento submetido possui pouquíssimos caracteres de texto e descrições vagas. Sugerimos preencher dados complementares de cargos e certificar as tecnologias-chave exigidas para ${level}.`);

  const cvAssessment = `${cvAssessmentP1} ${cvAssessmentP2}`;

  // Pillar 2: Interview Evaluation
  let scoreOfTranscript = 75;

  if (totalAnswers === 0) {
    scoreOfTranscript = 20; // Terminated immediately without responding
  } else {
    // 1. Verbosity deductions/bonuses
    if (avgWords < 12) {
      scoreOfTranscript -= 22; // Extreme superficiality
    } else if (avgWords < 22) {
      scoreOfTranscript -= 10; // Simple answers
    } else if (avgWords > 45) {
      scoreOfTranscript += 6; // Elaborated answers
    }

    // 2. Metrics (STAR method)
    if (!hasNumbers) {
      scoreOfTranscript -= 12; // Crucial missing STAR metrics
    } else {
      scoreOfTranscript += 4;
    }

    // 3. Pronoun ownership
    if (collectivePronounsCount > individualPronounsCount * 1.5) {
      scoreOfTranscript -= 8; // Collective hiding
    } else if (individualPronounsCount > 0) {
      scoreOfTranscript += 2;
    }

    // 4. Domain terminology
    if (matchedDomainTermsCount === 0) {
      scoreOfTranscript -= 10; // Completely generic answers
    } else if (matchedDomainTermsCount > 4) {
      scoreOfTranscript += 4;
    }

    // Programmatic adjustment for skipping questions
    const skipRatio = skippedCount / Math.max(1, totalAnswers);
    if (skipRatio > 0.5) {
      scoreOfTranscript = Math.max(15, Math.round(scoreOfTranscript * (1 - skipRatio * 0.75)));
    } else if (skippedCount > 0) {
      scoreOfTranscript -= (skippedCount * 8);
    }

    // Level correction
    if (level === "Sênior" || level === "Especialista/Lead") {
      // Much more rigorous on seniors
      if (!hasNumbers) scoreOfTranscript -= 6;
      if (avgWords < 25) scoreOfTranscript -= 10;
    } else if (level === "Júnior") {
      // Slightly softer on juniors
      scoreOfTranscript += 5;
    }
  }

  const interviewScore = Math.min(97, Math.max(15, scoreOfTranscript));

  // Determine dynamic diagnostic elements based on calculated metrics
  let summary = "";
  let strengths: string[] = [];
  let improvements: string[] = [];
  let recommendation = "";
  let interviewAssessment = "";

  if (isEnglish) {
    interviewAssessment = `During this interview with ${totalAnswers} exchanges, you answered ${answeredCount} directly, skipped ${skippedCount} items, and provided ${lowQualityCount} low quality answers. Your average elaboration was ${avgWords} words.`;

    if (totalAnswers === 0) {
      summary = `Dra. Ana Martins' Assessment Report: The technical simulation was terminated prematurely without any typed or recorded answers from the candidate. It is impossible to gauge your technical capabilities or communication fluency under these conditions.`;
      recommendation = "Simulation aborted. We advise restarting and fully responding to Dra. Ana's queries.";
    } else if (interviewScore < 65) {
      let dynamicSummary = `Dra. Ana Martins' Critical Assessment Report: Your conversational performance did not meet the expectations for a ${level} level in ${field}. `;
      dynamicSummary += `With an average of only ${avgWords} words per answer, your participation was extremely sparse and lacked descriptive substance.`;
      if (skippedCount > 0) {
        dynamicSummary += ` You skipped a total of ${skippedCount} question(s) during the session, showing high level of avoidance under technical questioning.`;
      }
      if (lowQualityCount > 0) {
        dynamicSummary += ` Furthermore, ${lowQualityCount} of your answers had fewer than 5 words, which limits professional assessment.`;
      }
      if (collectivePronounsCount > individualPronounsCount * 1.5) {
        dynamicSummary += ` You overused team-oriented collective pronouns, which dilutes your personal accountability and hides your direct contributions.`;
      } else if (individualPronounsCount > 0) {
        dynamicSummary += ` While you specified some individual tasks, your overall technical elaboration remained too superficial.`;
      }
      if (!hasNumbers) {
        dynamicSummary += ` Omission of key business numbers or concrete results prevents establishing your technical credibility.`;
      }
      summary = dynamicSummary;
      recommendation = `Not recommended for ${level} tracks. Re-study core strategic and practical concepts and practice verbalizing scenarios under pressure.`;
    } else if (interviewScore < 80) {
      let dynamicSummary = `Dra. Ana Martins' Assessment Report: You demonstrated acceptable base knowledge for a ${level} profile in ${field}, but your presentation lacks the professional precision required for high-performing environments. `;
      dynamicSummary += `Your average response length of ${avgWords} words demonstrates day-to-day familiarity but lacks strategic depth.`;
      if (skippedCount > 0) {
        dynamicSummary += ` Skipping ${skippedCount} question(s) limited the breadth of your functional profile assessment.`;
      }
      if (collectivePronounsCount > individualPronounsCount * 1.5) {
        dynamicSummary += ` Dr. Ana detected that you heavily rely on team accomplishments ('we did'), rather than showcasing your own precise architectural or business decisions.`;
      } else {
        dynamicSummary += ` Your usage of first-person descriptions shows appropriate ownership over key project aspects.`;
      }
      if (!hasNumbers) {
        dynamicSummary += ` To improve, try backstopping your accomplishments with key business data (e.g., performance metrics, speeds, efficiency gain).`;
      } else {
        dynamicSummary += ` Incorporating metrics helped support your tech capabilities, though they need to be more strategically framed.`;
      }
      summary = dynamicSummary;
      recommendation = "Approved with reservations. Continue practicing case studies with a strong emphasis on business results and individual ownership.";
    } else {
      let dynamicSummary = `Dra. Ana Martins' Professional Diagnosis: Outstanding performance in this technical simulation for a ${level} position in ${field}. `;
      dynamicSummary += `Your extensive answers (averaging ${avgWords} words) display deep operational mastery and vocabulary precision.`;
      if (skippedCount > 0) {
        dynamicSummary += ` However, even with ${skippedCount} skipped question, you compensated with high-quality descriptions.`;
      }
      if (individualPronounsCount >= collectivePronounsCount) {
        dynamicSummary += ` Your solid individual ownership of project choices was extremely evident in your responses.`;
      }
      if (hasNumbers) {
        dynamicSummary += ` Excellent integration of quantitative KPIs to prove business performance and ROI success.`;
      }
      summary = dynamicSummary;
      recommendation = `Highly recommended for ${level} roles in ${field}. Ready for final panel review.`;
    }
  } else {
    // Portuguese feedback templates
    interviewAssessment = `Durante o diálogo de ${totalAnswers} frentes de conversa, você respondeu ${answeredCount} perguntas de forma direta, pulou explicitamente ${skippedCount} questões e forneceu ${lowQualityCount} respostas curtas ou superficiais. A média de palavras por resposta válida foi de ${avgWords} palavras.`;

    if (totalAnswers === 0) {
      summary = `Parecer de Avaliação da Dra. Ana Martins: A simulação de entrevista técnica foi encerrada prematuramente sem que houvesse nenhuma resposta digitada ou gravada por parte do candidato. É inviável emitir um diagnóstico de maturidade técnica, resiliência ou expressão oral/escrita sem dados verbais.`;
      recommendation = "Simulação abortada sem dados. Recomenda-se reiniciar a simulação e responder às frentes de questionamento.";
    } else if (interviewScore < 65) {
      let dynamicSummary = `Parecer Crítico da Dra. Ana Martins: Suas respostas ficaram consideravelmente abaixo do patamar técnico e comportamental exigido para uma cadeira de nível ${level} em ${field}. `;
      dynamicSummary += `Com uma média de elaboração de apenas ${avgWords} palavras por resposta, sua participação foi lacônica e evasiva.`;
      if (skippedCount > 0) {
        dynamicSummary += ` O fato de ter pulado explicitamente ${skippedCount} pergunta(s) indica uma alta evasão sob pressão técnica e prática.`;
      }
      if (lowQualityCount > 0) {
        dynamicSummary += ` Foi registrado um montante de ${lowQualityCount} resposta(s) de altíssima superficialidade (menos de 5 palavras), o que dificulta avaliar sua real competência.`;
      }
      if (collectivePronounsCount > individualPronounsCount * 1.5) {
        dynamicSummary += ` A Dra. Ana notou uma predileção por relatar realizações exclusivamente em equipe ('nós fomos', 'fizemos') sem demarcar sua real autoria de projeto ou escopo individual.`;
      } else if (individualPronounsCount > 0) {
        dynamicSummary += ` Mesmo descrevendo algumas tarefas individuais em primeira pessoa, a falta de desenvolvimento das ideias impediu de atestar seu estofo profissional.`;
      }
      if (!hasNumbers) {
        dynamicSummary += ` Além disso, a total ausência de números, dados empíricos ou métricas de eficiência no relato enfraqueceu a autoridade de suas alegações.`;
      }
      summary = dynamicSummary;
      recommendation = `Perfil não recomendado no momento para posições nível ${level}. Sugere-se exercitar exaustivamente entrevistas comportamentais baseadas em cases reais.`;
    } else if (interviewScore < 80) {
      let dynamicSummary = `Parecer Avaliativo de Diagnóstico da Dra. Ana Martins: Você demonstra um domínio aceitável dos fluxos operacionais de ${field} no nível de ${level}, contudo sua argumentação ainda carece de estofo estratégico de negócios. `;
      dynamicSummary += `Sua média de elaboração de ${avgWords} palavras revela familiaridade com o fluxo diário, mas as respostas permanecem em nível predominantemente descritivo.`;
      if (skippedCount > 0) {
        dynamicSummary += ` O desfalque causado por ${skippedCount} questão(ões) pulada(s) reduziu consideravelmente a abrangência de sua avaliação em tópicos essenciais da área.`;
      }
      if (collectivePronounsCount > individualPronounsCount * 1.5) {
        dynamicSummary += ` A Dra. Ana Martins observou que você tende a dividir o protagonismo excessivamente com a equipe, omitindo escolhas técnicas críticas que tomou exclusivamente sob sua responsabilidade.`;
      } else {
        dynamicSummary += ` Sua postura no uso de pronomes individuais demonstrou protagonismo técnico adequado nas atividades que elencou.`;
      }
      if (!hasNumbers) {
        dynamicSummary += ` Para aumentar sua nota geral, procure atrelar suas conquistas passadas a resultados numéricos de impacto corporativo (produtividade, lucros ou rapidez de entrega).`;
      } else {
        dynamicSummary += ` A presença de dados matemáticos na conversa ajudou a respaldar suas competências práticos, embora eles devam estar mais estruturados sob a ótica STAR.`;
      }
      summary = dynamicSummary;
      recommendation = "Candidato aprovado com ressalvas estruturais. Recomenda-se refinar a apresentação de cases orientando-os rigidamente para resultados de performance.";
    } else {
      let dynamicSummary = `Parecer Técnico Excelente da Dra. Ana Martins: Performance técnica inquestionável para a posição de ${field} (nível ${level}). `;
      dynamicSummary += `Suas respostas foram densas e aprofundadas (com média de ${avgWords} palavras por resposta), exibindo pleno domínio prático dos cenários propostos.`;
      if (skippedCount > 0) {
        dynamicSummary += ` Apesar de ter pulado ${skippedCount} pergunta(s) técnica(s), a alta qualidade e profundidade das respostas dadas compensou satisfatoriamente essa lacuna.`;
      }
      if (individualPronounsCount >= collectivePronounsCount) {
        dynamicSummary += ` O protagonismo individual e a autoria direta sobre as entregas mais complexas foram evidenciados com maestria em sua comunicação fluida.`;
      }
      if (hasNumbers) {
        dynamicSummary += ` Excelente ancoragem em indicadores numéricos de sucesso e eficiência operacional, respaldando sua sólida trajetória baseada em dados.`;
      }
      summary = dynamicSummary;
      recommendation = `Altamente recomendado para posições nível ${level} em ${field}. Perfil robusto e pronto para contratação imediata.`;
    }
  }

  // Generate dynamic strengths and improvements list using computed metrics
  let strengthsList: string[] = [];
  let improvementsList: string[] = [];

  if (isEnglish) {
    if (cvText && cvText.length > 200) {
      strengthsList.push("The submitted CV is highly comprehensive and lists rich professional skills.");
    } else {
      strengthsList.push("Clear selection of target professional category and interest alignment.");
    }

    if (avgWords > 25) {
      strengthsList.push(`Strong verbal elaboration, averaging ${avgWords} words per response.`);
    } else {
      strengthsList.push("Direct, honest communication tone without verbose stalling.");
    }

    if (hasNumbers) {
      strengthsList.push("Good integration of numeric metrics or business KPI data in your stories.");
    } else if (matchedDomainTermsCount > 2) {
      strengthsList.push(`Active usage of core industry terms related to ${field}.`);
    } else {
      strengthsList.push("Systematic response to the structured onboarding questions.");
    }

    // Improvements build
    if (!cvText || cvText.length < 100) {
      improvementsList.push("Enrich your static CV text with detailed historical descriptions and quantitative metrics.");
    }
    if (avgWords < 20) {
      improvementsList.push(`Drastically increase response elaboration (aim for 30+ average words) to display your logic.`);
    }
    if (skippedCount > 0) {
      improvementsList.push(`Avoid skipping technical questions (you skipped ${skippedCount} question(s)) during key evaluation rounds.`);
    }
    if (!hasNumbers) {
      improvementsList.push("Implement the STAR method to anchor your answers in measurable, numeric business impacts.");
    }
    if (collectivePronounsCount > individualPronounsCount * 1.5) {
      improvementsList.push("Shift pronoun custody to clarify your individual contributions instead of hiding behind a team ('we did').");
    }
  } else {
    if (cvText && cvText.length > 200) {
      strengthsList.push("O currículo em texto submetido é robusto, detalhado e apresenta boa organização cronológica.");
    } else {
      strengthsList.push("Alinhamento adequado de objetivos e área de atuação no setup inicial.");
    }

    if (avgWords > 25) {
      strengthsList.push(`Forte capacidade de elaboração e detalhamento de ideias, com média de ${avgWords} palavras por resposta.`);
    } else {
      strengthsList.push("Postura de comunicação direta e transparente.");
    }

    if (hasNumbers) {
      strengthsList.push("Excelente citação de dados, números de impacto ou indicadores percentuais em suas respostas.");
    } else if (matchedDomainTermsCount > 2) {
      strengthsList.push(`Uso qualificado de terminologias e conceitos chave essenciais do dia a dia de ${field}.`);
    } else {
      strengthsList.push("Preenchimento e engajamento inicial com o ecossistema de avaliação técnica.");
    }

    // Improvements build
    if (!cvText || cvText.length < 100) {
      improvementsList.push("Enriquecer as descrições de cargos no seu currículo de texto, detalhando projetos específicos.");
    }
    if (avgWords < 20) {
      improvementsList.push(`Aumentar substancialmente a elaboração verbal (média atual de ${avgWords} palavras) para demonstrar estofo técnico.`);
    }
    if (skippedCount > 0) {
      improvementsList.push(`Evitar evasões de perguntas (pulou ${skippedCount} questão(ões) técnica(s)), o que gera desconfiança sobre domínio prático.`);
    }
    if (!hasNumbers) {
      improvementsList.push("Empregar o método STAR para atrelar seus cases de sucesso a métricas duras de eficiência, latência, conversão ou receita.");
    }
    if (collectivePronounsCount > individualPronounsCount * 1.5) {
      improvementsList.push("Adotar pronomes de autoria individual ('eu decidi', 'eu estruturei') para evidenciar o seu papel exclusivo de entrega.");
    }
  }

  if (strengthsList.length === 0) {
    strengthsList = isEnglish ? ["Basic navigation through the interview platform."] : ["Navegação básica concluída no portal de avaliação."];
  }
  if (improvementsList.length === 0) {
    improvementsList = isEnglish ? ["Keep practicing more advanced scenario simulations."] : ["Continue exercitando respostas com cenários avançados do mercado."];
  }

  strengths = strengthsList.slice(0, 3);
  improvements = improvementsList.slice(0, 3);

  // General candidate classification score (weighted average: 25% CV + 75% Interview)
  let overallScore = Math.min(97, Math.max(15, Math.round(cvScore * 0.25 + interviewScore * 0.75)));
  if (isMismapped) {
    overallScore = Math.min(18, overallScore);
  }

  const competencies = {
    communication: Math.min(100, Math.max(15, Math.round(interviewScore * 0.95 + (avgWords > 30 ? 5 : -4)))),
    technical: isMismapped ? 10 : Math.min(100, Math.max(15, Math.round(cvScore * 0.4 + interviewScore * 0.6))),
    problemSolving: Math.min(100, Math.max(15, Math.round(interviewScore * 0.9 + (avgWords > 35 ? 8 : -5)))),
    experienceMatch: isMismapped ? 10 : Math.min(100, Math.max(15, cvScore)),
    focusResults: Math.min(100, Math.max(15, Math.round(interviewScore * 0.82 + (hasNumbers ? 15 : -15))))
  };

  const isCustomEval = isCustomJobRequirements(jobRequirements, field, level);
  const fallbackVacancy = isCustomEval 
    ? extractVacancyTitle(jobRequirements, field, level) 
    : `${field} ${level}`;

  const fallbackCandidateRole = isMismapped 
    ? "Perfil Diferenciado / Outra Trajetória" 
    : extractCandidateRole(cvText, field, level);

  return {
    cvScore,
    cvAssessment,
    interviewScore,
    interviewAssessment,
    score: overallScore,
    overallScore,
    summary,
    strengths,
    improvements,
    recommendation,
    identifiedVacancy: fallbackVacancy,
    identifiedCandidateRole: fallbackCandidateRole,
    convergentPoints: isMismapped
      ? (isEnglish ? ["Demonstration of initiative and motivation to shift focus."] : ["Demonstração de iniciativa e motivação para novas áreas de atuação."])
      : (isEnglish
          ? [`Communicated willingness to learn and align with ${field} fundamentals.`, `Coherent flow of thoughts relative to the requirements of level ${level}.`]
          : [`Demonstração de boa comunicação verbal e interesse genuíno nas perguntas de ${field}.`, `Alinhamento de discurso geral com as atribuições de nível ${level}.`]),
    divergentPoints: isMismapped
      ? (isEnglish
          ? ["Total discrepancy between professional history and requirements.", "Missing mandatory credentials or certifications for the target role."]
          : ["Incompatibilidade direta de portfólio estruturado e histórico de cargos.", "Ausência de credenciais ou licenças profissionais obrigatórias recomendadas para a vaga."])
      : (isEnglish
          ? ["Lack of standardized STAR methodology indicators in the CV.", "Specific tools or auxiliary frameworks requested by the vacancy but not stated in text."]
          : ["Ausência de indicadores estruturais no método STAR para comprovação de dados.", "Ferramentas ou frameworks secundários solicitados na vaga que não constam textualmente no CV."]),
    competencies
  };
}

// Helper to analyze the coherence between candidate's CV and the job vacancy requirements
async function checkCvCoherence(ai: any, config: any): Promise<{ coherent: boolean; reason: string }> {
  const cvText = config.cvText || "";
  const jobRequirements = config.jobRequirements || "";
  const field = config.field || "Geral";
  const experienceLevel = config.experienceLevel || "Sênior";

  if (!cvText.trim()) {
    return { coherent: true, reason: "" };
  }

  const prompt = `Você é a Dra. Ana Martins, recrutadora sénior de elite com 20 anos de experiência em recrutamento comportamental e técnico.
Avalie estritamente a COERÊNCIA entre o currículo do candidato e a vaga alvo/requisitos informados.

MÉTRICA DE COERÊNCIA:
- COERENTE (coherent: true): Há harmonia básica, alinhamento de área ou competências transferíveis aplicáveis entre a trajetória do candidato e a vaga desejada. (Ex: um dev Javascript ou desenvolvedor júnior aplicando para desenvolvedor React plenom; um analista administrativo aplicando para finanças; ou profissional em transição de carreira evidente com forte base correlata).
- INCOERENTE (coherent: false): Uma total e absoluta desconexão profissional, onde as habilidades do candidato não encontram nenhum ponto técnico ou prático comum com as exigências cruciais da vaga descrita. (Ex: um Chef de Cozinha ou padeiro sem nenhuma formação de enfermagem aplicando para vaga técnica de Enfermagem/Saúde Clínica; ou um redator de letras focado puramente em literatura e sem nenhuma base de código aplicando para vaga de Engenheiro de Software Sênior ou Administrador de Redes de Telecomunicações).

Vaga Desejada e Requisitos:
${jobRequirements} (Área geral selecionada: ${field}, Nível: ${experienceLevel})

Currículo Atual do Candidato:
${cvText}

Retorne estritamente um JSON no seguinte formato exato de objeto, sem crase, barras ou blocos de código com markdown:
{
  "coherent": true ou false,
  "reason": "Feedback educado, formal, empático, porém extremamente firme e direto explicando as razões semânticas da incompatibilidade. Máximo 3 frases. Mantenha em português e assine como Dra. Ana Martins."
}`;

  try {
    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coherent: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["coherent", "reason"]
        }
      }
    });

    let text = response.text || "";
    if (text.startsWith("```json")) {
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    }
    const parsed = JSON.parse(text);
    return {
      coherent: parsed.coherent !== false,
      reason: parsed.reason || "Seu currículo não possui alinhamento adequado com as especificações mínimas desta vaga."
    };
  } catch (error) {
    console.warn("[Coherence Check Failed] Assumindo coerência por tolerância de fallback offline:", error);
    return { coherent: true, reason: "" };
  }
}

// --- GUEST OR AUTHENTICATED BASIC CV ANALYSIS ROUTE ---
router.post("/api/guest/analyze-cv", async (req, res) => {
  const { config } = req.body;
  if (!config || !config.cvText) {
    return res.status(400).json({ error: "O texto do currículo é obrigatório para análise." });
  }

  try {
    const ai = getGeminiClient(config.apiKey);

    // Mandato de Coerência entre Vaga e Currículo
    const coherence = await checkCvCoherence(ai, config);
    if (!coherence.coherent) {
      return res.status(400).json({
        error: coherence.reason
      });
    }
    
    const prompt = getCvAnalysisPrompt(
      config.field,
      config.experienceLevel,
      config.language,
      config.cvText,
      config.analysisMethod,
      config.jobRequirements
    );

    const systemInstruction = getSystemPrompt(config.language, config.experienceLevel);

    // Alterado para a estrutura padrão aceita pelo SDK do Gemini com suporte a retry e fallback
    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { // <-- Corrigido de 'generationConfig' para 'config'
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: "Pontuação curricular de 0 a 100. CRÍTICO: Se houver incompatibilidade/incoerência brutal de área profissional com a vaga (ex: um designer/desenvolvedor para Enfermagem, ou um enfermeiro para tecnologia), reduza obrigatoriamente para um valor entre 0 e 20." },
            generalAssessment: { type: Type.STRING, description: "Avaliação básica condensada do currículo. CRÍTICO: Caso haja incompatibilidade brusca de perfil com a vaga, a primeira frase DEVE notificar isso diretamente." },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 a 3 pontos fortes de currículo."
            },
            areasToImprove: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 a 3 áreas recomendadas de aprimoramento."
            },
            recommendation: { type: Type.STRING, description: "Sugestão prática de melhoria imediata do documento." },
            identifiedVacancy: { type: Type.STRING, description: "Título da vaga alvo sob candidatura. CRÍTICO: Se a vaga contiver requisitos customizados, IGNORE os campos de formulário padrão (como Área ou Nível) e extraia um título curto e realista (ex: 'Desenvolvedor React Pleno' ou 'Gerente de Contabilidade') diretamente do texto de requisitos/especificações da vaga que consta na solicitação." },
            identifiedCandidateRole: { type: Type.STRING, description: "Cargo ou perfil atual do candidato de acordo estritamente com o currículo apresentado, ex: Designer Gráfico Júnior ou Enfermeiro Geral." },
            convergentPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Coleção de 2 a 4 strings detalhando pontos específicos reais onde a senioridade, competências ou ferramentas descritas no currículo CONVERGEM perfeitamente com os requisitos exigidos para a vaga."
            },
            divergentPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Coleção de 2 a 4 strings especificando as lacunas, ausências gritantes de framework/formação ou desvios profissionais onde o currículo do candidato DIVERGE das expectativas técnicas e senioridade da vaga alvo."
            },
            competencies: {
              type: Type.OBJECT,
              description: "Pontuações de competências de 0 a 100 baseadas na análise do currículo.",
              properties: {
                communication: { type: Type.INTEGER, description: "Clareza da escrita do currículo de 0 a 100." },
                technical: { type: Type.INTEGER, description: "Nível técnico para a vaga alvo de 0 a 100. Deve ser reduzido para 0-20 se for incompatível." },
                problemSolving: { type: Type.INTEGER, description: "Conquistas de solução de problemas descritas de 0 a 100." },
                experienceMatch: { type: Type.INTEGER, description: "Aderência direta à senioridade e mercado alvo de 0 a 100. Deve ser reduzido para 0-20 se for de outra área de atuação totalmente distinta." },
                focusResults: { type: Type.INTEGER, description: "Foco e métricas de resultados de 0 a 100." }
              },
              required: ["communication", "technical", "problemSolving", "experienceMatch", "focusResults"]
            }
          },
          required: ["overallScore", "generalAssessment", "strengths", "areasToImprove", "recommendation", "identifiedVacancy", "identifiedCandidateRole", "convergentPoints", "divergentPoints", "competencies"]
        }
      }
    });

    let resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    // Camada extra de proteção: Limpa blocos de código markdown se a IA ignorar o mimeType
    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    } else if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    }

    const parsed = JSON.parse(resultText);
    res.json({ evaluation: parsed, actualModelUsed: (response as any).actualModelUsed });

  } catch (error: any) {
    logQuietGeminiError("/api/guest/analyze-cv", error);
    if (isRateLimitError(error) || config?.simulateRateLimit) {
      return res.status(429).json({
        error: "Gemini Rate Limit Exceeded",
        isRateLimited: true,
        retryAfter: 14400,
        message: "Você atingiu o limite de requisições da API do Gemini. Por favor, aguarde 4 horas antes de tentar novamente."
      });
    }
    const fallbackResults = getFallbackCvAnalysis(config.cvText, config.field, config.experienceLevel, config.language, config.jobRequirements);
    res.json({ evaluation: fallbackResults, actualModelUsed: "offline" });
  }
});

// --- INITIALIZE SIMULATION AND GENERATE QUESTIONS ---
router.post("/api/init-interview", async (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: "Missing config object." });
  }

  try {
    const ai = getGeminiClient(config.apiKey);

    // Mandato de Coerência entre Vaga e Currículo
    const coherence = await checkCvCoherence(ai, config);
    if (!coherence.coherent) {
      return res.status(400).json({
        error: coherence.reason
      });
    }
    
    const prompt = getGenerateQuestionsPrompt(
      config.field,
      config.experienceLevel,
      config.language,
      config.cvText,
      config.analysisMethod,
      config.jobRequirements
    );

    const systemInstruction = getSystemPrompt(config.language, config.experienceLevel);

    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de exatamente 7 perguntas de entrevista personalizadas para o perfil."
            }
          },
          required: ["questions"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsed = JSON.parse(resultText);
    res.json({ questions: parsed.questions, actualModelUsed: (response as any).actualModelUsed });
  } catch (error: any) {
    logQuietGeminiError("/api/init-interview", error);
    if (isRateLimitError(error) || config?.simulateRateLimit) {
      return res.status(429).json({
        error: "Gemini Rate Limit Exceeded",
        isRateLimited: true,
        retryAfter: 14400,
        message: "Você atingiu o limite de requisições da API do Gemini. Por favor, aguarde 4 horas antes de tentar novamente."
      });
    }
    const fbQuestions = getFallbackQuestions(config.field, config.experienceLevel, config.language, config.cvText);
    res.json({ questions: fbQuestions, actualModelUsed: "offline" });
  }
});

// --- EXECUTE TURN-BY-TURN INTERACTIVE CHAT FLOW ---
router.post("/api/interview/next-turn", async (req, res) => {
  const { config, chatHistory, questions, currentQuestionIndex } = req.body;
  try {
    if (!config || !chatHistory || !questions) {
      return res.status(400).json({ error: "Parâmetros 'config', 'chatHistory' e 'questions' são obrigatórios." });
    }

    const ai = getGeminiClient(config.apiKey);
    const systemInstruction = getSystemPrompt(config.language, config.experienceLevel);
    const prompt = getNextTurnPrompt(config, chatHistory, questions, currentQuestionIndex);

    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Explicação ou comentário neutro de transição acompanhada da próxima pergunta ou pedido de clarificação." },
            clarificationRequired: { type: Type.BOOLEAN, description: "Indica se foi solicitada uma pergunta de esclarecimento por resposta vaga ou incompleta." },
            endOfInterview: { type: Type.BOOLEAN, description: "Indica que todas as perguntas foram exauridas e a entrevista terminou." }
          },
          required: ["text", "clarificationRequired", "endOfInterview"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsed = JSON.parse(resultText);
    res.json({ ...parsed, actualModelUsed: (response as any).actualModelUsed });
  } catch (error: any) {
    logQuietGeminiError("/api/interview/next-turn", error);
    if (isRateLimitError(error) || config?.simulateRateLimit) {
      return res.status(429).json({
        error: "Gemini Rate Limit Exceeded",
        isRateLimited: true,
        retryAfter: 14400,
        message: "Você atingiu o limite de requisições da API do Gemini. Por favor, aguarde 4 horas antes de tentar novamente."
      });
    }
    const nextQuestion = questions[currentQuestionIndex + 1] || "A entrevista está finalizada e agendada com nosso time. Vamos revisar o seu diagnóstico corporativo completo de forma imediata.";
    res.json({
      text: nextQuestion,
      clarificationRequired: false,
      endOfInterview: currentQuestionIndex + 1 >= questions.length,
      actualModelUsed: "offline"
    });
  }
});

// --- EVALUATE THE FULL CONVERSATION ON INTERVIEW END ---
router.post("/api/evaluate", async (req, res) => {
  const { config, chatHistory } = req.body;
  if (!config || !chatHistory || !Array.isArray(chatHistory)) {
    return res.status(400).json({ error: "Missing config or chatHistory array." });
  }

  try {
    const ai = getGeminiClient(config.apiKey);

    // Format full transcript for evaluation
    const transcript = chatHistory
      .map((msg: any) => `${msg.role === "interviewer" ? "Dra. Ana (Entrevistadora)" : "Candidato"}: ${msg.text}`)
      .join("\n\n");

    // Programmatic stats calculation
    const candAnswers = chatHistory
      .filter((m: any) => m.role === "candidate")
      .map((m: any) => (m.text || "").trim())
      .filter(Boolean);

    const totalQuestions = chatHistory.filter((m: any) => m.role === "interviewer").length;
    const skippedCount = chatHistory.filter((m: any) => m.role === "candidate" && (
      (m.text || "").includes("pulou") || 
      (m.text || "").includes("skip") || 
      (m.text || "").includes("pulada") || 
      (m.text || "").includes("skipped") || 
      !(m.text || "").trim()
    )).length;
    
    // An answer is "answered" if not empty and not skipped
    const answeredCount = candAnswers.length - skippedCount;
    
    // Low quality answers: < 5 words & not containing skipped
    const lowQualityCount = chatHistory.filter((m: any) => {
      if (m.role !== "candidate") return false;
      const text = (m.text || "").trim();
      if (!text) return true;
      if (text.includes("pulou") || text.includes("skip") || text.includes("pulada") || text.includes("skipped") || text.includes("[Questão")) return false;
      const words = text.split(/\s+/).filter(Boolean);
      return words.length < 5;
    }).length;

    let wordCountTotal = 0;
    let cleanAnswersCount = 0;
    candAnswers.forEach(ans => {
      if (ans.includes("pulou") || ans.includes("skip") || ans.includes("pulada") || ans.includes("skipped") || ans.includes("[Questão")) return;
      const words = ans.split(/\s+/).filter(Boolean);
      wordCountTotal += words.length;
      cleanAnswersCount++;
    });
    const avgWords = cleanAnswersCount > 0 ? Math.round(wordCountTotal / cleanAnswersCount) : 0;

    const stats = {
      totalQuestions: totalQuestions || 7, // Default back to 7
      candidateAnswersCount: answeredCount,
      skippedCount,
      lowQualityAnswersCount: lowQualityCount,
      avgWords
    };

    const prompt = getEvaluatePrompt(
      config.field,
      config.experienceLevel,
      config.language,
      transcript,
      config.cvText || "",
      stats,
      config.analysisMethod,
      config.jobRequirements
    );

    const systemInstruction = getSystemPrompt(config.language, config.experienceLevel);

    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cvScore: { type: Type.INTEGER, description: "Classificação curricular de 0 a 100 de acordo com as exigências padrão para essa área de mercado. CRÍTICO: Se houver incompatibilidade brutal de área profissional com a vaga (ex: um designer para Enfermagem ou vice-versa), esta nota DEVE ser obrigatoriamente muito baixa, entre 0 e 20." },
            cvAssessment: { type: Type.STRING, description: "Avaliação analítica detalhada comparando o currículo do candidato com as competências esperadas. CRÍTICO: Se houver incompatibilidade de área/cargo, declare essa falha grave de perfil de forma explícita na primeira frase." },
            interviewScore: { type: Type.INTEGER, description: "Classificação da entrevista de 0 a 100, avaliando frentes de respostas e pulos." },
            interviewAssessment: { type: Type.STRING, description: "Avaliação analítica detalhada de como ele respondeu as perguntas." },
            overallScore: { type: Type.INTEGER, description: "Classificação Geral do candidato à vaga (ponderando CV + entrevista), de 0 a 100. CRÍTICO: Se houver incompatibilidade grave de área profissional, rebaixe de forma rigorosa toda a nota geral final para que reflita a falta de requisitos principais da vaga." },
            summary: { type: Type.STRING, description: "Resumo executivo de diagnóstico integrado." },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 2 a 3 pontos fortes reais observados."
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de pontos essenciais para melhoria urgente."
            },
            recommendation: { type: Type.STRING, description: "Decisão / sugestão profissional curta da Dra. Ana Martins." },
            identifiedVacancy: { type: Type.STRING, description: "Título da vaga alvo sob candidatura. CRÍTICO: Se a vaga contiver requisitos customizados, IGNORE os campos de formulário padrão (como Área ou Nível) e extraia um título curto e realista (ex: 'Desenvolvedor React Pleno' ou 'Gerente de Contabilidade') diretamente do texto de requisitos/especificações da vaga que consta na solicitação." },
            identifiedCandidateRole: { type: Type.STRING, description: "Cargo ou perfil atual do candidato de acordo estritamente com o currículo apresentado, ex: Designer Gráfico Júnior." },
            convergentPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Coleção de 2 a 4 strings contendo pontos específicos reais onde a senioridade, competências ou ferramentas descritas no currículo/entrevista CONVERGEM perfeitamente com os requisitos da vaga."
            },
            divergentPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Coleção de 2 a 4 strings detalhando pontos de desconexão grave, lacuna técnica ou discrepância de senioridade onde as competências/experiência DIVERGEM das expectativas da vaga."
            },
            competencies: {
              type: Type.OBJECT,
              properties: {
                communication: { type: Type.INTEGER, description: "Habilidade de comunicação, clareza verbal e transparência, de 0 a 100." },
                technical: { type: Type.INTEGER, description: "Senioridade técnica prática demonstrada nas respostas e no CV, de 0 a 100. Se for incompatível de área profissional, reduza para 0-20." },
                problemSolving: { type: Type.INTEGER, description: "Capacidade de resolução de cenários complexos, de 0 a 100." },
                experienceMatch: { type: Type.INTEGER, description: "Aderência direta de experiência prévia com o mercado selecionado, de 0 a 100. Se for de mercado totalmente disassociado, reduza para 0-20." },
                focusResults: { type: Type.INTEGER, description: "Foco em resultados e sustentação com dados métricos, de 0 a 100." }
              },
              required: ["communication", "technical", "problemSolving", "experienceMatch", "focusResults"]
            }
          },
          required: ["cvScore", "cvAssessment", "interviewScore", "interviewAssessment", "overallScore", "summary", "strengths", "improvements", "recommendation", "identifiedVacancy", "identifiedCandidateRole", "convergentPoints", "divergentPoints", "competencies"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsedGemini = JSON.parse(resultText);
    
    // Map backend response matching the requested schema constraint to client-side UI needs
    const mappedEvaluation = {
      overallScore: parsedGemini.overallScore,
      generalAssessment: parsedGemini.summary,
      strengths: parsedGemini.strengths,
      areasToImprove: parsedGemini.improvements,
      recommendation: parsedGemini.recommendation,
      identifiedVacancy: parsedGemini.identifiedVacancy,
      identifiedCandidateRole: parsedGemini.identifiedCandidateRole,
      convergentPoints: parsedGemini.convergentPoints,
      divergentPoints: parsedGemini.divergentPoints,
      cvScore: parsedGemini.cvScore,
      cvAssessment: parsedGemini.cvAssessment,
      interviewScore: parsedGemini.interviewScore,
      interviewAssessment: parsedGemini.interviewAssessment,
      competencies: parsedGemini.competencies || {
        communication: Math.min(100, Math.max(10, parsedGemini.interviewScore)),
        technical: Math.min(100, Math.max(10, Math.round(parsedGemini.cvScore * 0.25 + parsedGemini.interviewScore * 0.75))),
        problemSolving: Math.min(100, Math.max(10, parsedGemini.interviewScore)),
        experienceMatch: Math.min(100, Math.max(10, parsedGemini.cvScore)),
        focusResults: Math.min(100, Math.max(10, parsedGemini.interviewScore))
      }
    };

    res.json({ evaluation: mappedEvaluation, actualModelUsed: (response as any).actualModelUsed });
  } catch (error: any) {
    logQuietGeminiError("/api/evaluate", error);
    if (isRateLimitError(error) || config?.simulateRateLimit) {
      return res.status(429).json({
        error: "Gemini Rate Limit Exceeded",
        isRateLimited: true,
        retryAfter: 14400,
        message: "Você atingiu o limite de requisições da API do Gemini. Por favor, aguarde 4 horas antes de tentar novamente."
      });
    }
    const parsedFallback = getFallbackEvaluation(chatHistory, config.field, config.experienceLevel, config.language, config.cvText || "", config.jobRequirements);
    
    const mappedFallback = {
      overallScore: parsedFallback.overallScore,
      generalAssessment: parsedFallback.summary,
      strengths: parsedFallback.strengths,
      areasToImprove: parsedFallback.improvements,
      recommendation: parsedFallback.recommendation,
      identifiedVacancy: parsedFallback.identifiedVacancy,
      identifiedCandidateRole: parsedFallback.identifiedCandidateRole,
      convergentPoints: parsedFallback.convergentPoints,
      divergentPoints: parsedFallback.divergentPoints,
      cvScore: parsedFallback.cvScore,
      cvAssessment: parsedFallback.cvAssessment,
      interviewScore: parsedFallback.interviewScore,
      interviewAssessment: parsedFallback.interviewAssessment,
      competencies: parsedFallback.competencies
    };
    
    res.json({ evaluation: mappedFallback, actualModelUsed: "offline" });
  }
});

// Heuristic local fallback for multi-CV recruiter triage
function getFallbackRecruiterTriage(jobRequirements: string, candidates: { name: string; cvText: string }[]) {
  return candidates.map((c, idx) => {
    const reqWords = (jobRequirements || "").toLowerCase().split(/\W+/);
    const cvWords = (c.cvText || "").toLowerCase().split(/\W+/);
    const common = cvWords.filter(w => w.length > 3 && reqWords.includes(w));
    const uniqueCommon = Array.from(new Set(common));
    
    // Base score on common keywords and length
    let score = 52 + Math.min(43, uniqueCommon.length * 3.5);
    if (c.cvText.length < 100) score = Math.max(15, score - 35);
    if (score > 98) score = 98;
    
    let strengths = [
      "Demonstra termos técnicos compatíveis com a área solicitada.",
      "Apresenta histórico de projetos práticos e compatibilidade curricular.",
      "Estrutura executiva de currículo bem organizada."
    ];
    let gaps = [
      "Necessidade de validar proficiência prática em ferramentas específicas descritas no escopo.",
      "Detalhamento qualitativo secundário das conquistas em posições anteriores pode ser aprofundado."
    ];
    let recommendation = "Avançar para Entrevista Técnica";
    if (score >= 80) {
      recommendation = "Contratação Altamente Recomendada (Favorito)";
    } else if (score < 60) {
      recommendation = "Manter em Banco de Talentos para Futuro";
      gaps.unshift("Correspondência de qualificações principais abaixo do esperado para o nível.");
    }
    
    return {
      name: c.name || `Candidato ${idx + 1}`,
      matchScore: Math.round(score),
      strengths,
      gaps,
      summary: `Análise de aderência curricular preliminar indica correspondência de nível ${score >= 80 ? 'Excelente' : score >= 65 ? 'Intermediário' : 'Básico'} com relação aos requisitos fundamentais fornecidos para a vaga descrita. Mapeamento de keywords críticas completado.`,
      recommendation
    };
  });
}

router.post("/api/recruiter/triage", async (req, res) => {
  try {
    const { jobRequirements, field, experienceLevel, language, candidates, apiKey, isCustom } = req.body;

    if (!jobRequirements || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Requisitos da vaga e lista de candidatos são obrigatórios." });
    }

    const isCustomBool = !!isCustom;
    let extractedField = field || "Tech";
    let extractedSeniority = experienceLevel || "Sênior";

    if (isCustomBool) {
      // Heuristic fallback matching on jobRequirements when offline or as pre-processing
      const reqLower = jobRequirements.toLowerCase();
      
      // Determine field
      if (reqLower.includes("enfermagem") || reqLower.includes("coren") || reqLower.includes("saúde") || reqLower.includes("hospital") || reqLower.includes("médic")) {
        extractedField = "Enfermagem / Saúde";
      } else if (reqLower.includes("design") || reqLower.includes("figma") || reqLower.includes("ux") || reqLower.includes("ui") || reqLower.includes("frontend")) {
        extractedField = "UI/UX & Product Design";
      } else if (reqLower.includes("marketing") || reqLower.includes("ads") || reqLower.includes("tráfego") || reqLower.includes("branding") || reqLower.includes("seo")) {
        extractedField = "Marketing & Analytics";
      } else if (reqLower.includes("contábil") || reqLower.includes("contabilidade") || reqLower.includes("finanças") || reqLower.includes("fiscal") || reqLower.includes("sap")) {
        extractedField = "Finanças e Contábil";
      } else if (reqLower.includes("telecom") || reqLower.includes("rede") || reqLower.includes("fibra") || reqLower.includes("infra") || reqLower.includes("bgp")) {
        extractedField = "Telecom e Infra";
      } else if (reqLower.includes("produto") || reqLower.includes("po ") || reqLower.includes("pm ") || reqLower.includes("product owner") || reqLower.includes("scrum") || reqLower.includes("negócio")) {
        extractedField = "Negócios & Produtos";
      } else {
        extractedField = "Tech / Desenvolvimento";
      }

      // Determine seniority
      if (reqLower.includes("diretor") || reqLower.includes("head") || reqLower.includes("chief") || reqLower.includes("principal") || reqLower.includes("especialista") || reqLower.includes("lead") || reqLower.includes("liderança") || reqLower.includes("liderar")) {
        extractedSeniority = "Especialista / Lead";
      } else if (reqLower.includes("sênior") || reqLower.includes("senior") || reqLower.includes("sr") || reqLower.includes("anciã") || reqLower.includes("experiente")) {
        extractedSeniority = "Sênior";
      } else if (reqLower.includes("júnior") || reqLower.includes("junior") || reqLower.includes("jr") || reqLower.includes("estágio") || reqLower.includes("estagiário") || reqLower.includes("trainee") || reqLower.includes("iniciante")) {
        extractedSeniority = "Júnior";
      } else {
        extractedSeniority = "Pleno"; // Market safe default
      }
    }

    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse || keyToUse === "undefined") {
      console.log("[Recruiter Triage] No API Key provided or found. Utilizing high-fidelity local fallback.");
      const fallbackList = getFallbackRecruiterTriage(jobRequirements, candidates);
      return res.json({
        analysisList: fallbackList,
        actualModelUsed: "offline",
        extractedField,
        extractedSeniority
      });
    }

    const ai = getGeminiClient(keyToUse);

    // Build the prompt for Gemini
    const listText = candidates.map((c, idx) => `
--- CANDIDATO REGISTRADO #${idx + 1} ---
NOME DECLARADO: ${c.name || `Candidato #${idx + 1}`}
CONTEÚDO TEXTUAL DO CURRÍCULO:
${c.cvText}
----------------------------------------
`).join("\n");

    let customInstructionsInfo = "";
    if (isCustomBool) {
      customInstructionsInfo = `
CRÍTICO: O recrutador enviou uma descrição personalizada sem especificar as opções padrão na seleção.
Você DEVE analisar rigorosamente a descrição dos requisitos críticos abaixo fornecida e extrair de forma precisa:
1. O Setor de Atuação correspondente (ex: "Tech / Desenvolvimento", "Negócios & Produtos", "UI/UX & Product Design", "Marketing & Analytics", "Saúde & Enfermagem", "Telecom e Infra", "Finanças e Contábil" ou similar).
2. O nível de Senioridade correspondente (deve ser um de: "Júnior", "Pleno", "Sênior", "Especialista/Lead", ou outro).
Se tais informações não estiverem explicitamente escritas no texto da descrição, você DEVE analisar as competências exigidas de acordo com as práticas vigentes do mercado de trabalho para deduzir em qual delas se enquadra melhor (ex: tecnologias listadas, nível de autonomia, liderança de times).
Defina os valores inferidos/computados nas propriedades de retorno nível raiz: "extractedField" e "extractedSeniority" do seu JSON.`;
    } else {
      customInstructionsInfo = `
DADOS DA VAGA:
- Setor: ${extractedField}
- Senioridade Requerida: ${extractedSeniority}
Aproveite esses valores fornecidos e replique-os diretamente nas propriedades de retorno nível raiz "extractedField" e "extractedSeniority" do seu JSON.`;
    }

    const recruiterPrompt = `Você é um Recrutador Técnico Sénior e Consultor de Talentos experiente da área de Recursos Humanos. Se comporte estritamente como a Dr. Ana Martins (20 anos de experiência em recrutamento técnico).
Analise com altíssimo senso crítico e rigor os currículos enviados com base na descrição da vaga e requisitos fornecidos.

CONFIGURAÇÕES DE TRIAGEM:
${customInstructionsInfo}
- Idioma da contratação: ${language || "Português"}
- Descrição da vaga e Requisitos Principais:
${jobRequirements}

---
LISTA DE CURRÍCULOS PRESENTES:
${listText}

---
INSTRUÇÕES DE ANÁLISE:
1. Compare cada currículo com os requisitos da vaga de forma idônea e imparcial. 
2. Defina uma pontuação de 0 a 100 de proximidade e compatibilidade real ("matchScore"). Seja rigoroso (atribua 90-100 apenas para candidatos excepcionais que preencham quase tudo).
3. Identifique até 3 Pontos Fortes ("strengths") mais salientes do candidato para preencher essa vaga.
4. Identifique até 3 Gaps/Melhorias importantes ("gaps") ou requisitos exigidos que o candidato não possui/não mencionou clearamente.
5. Escreva um resumo descritivo conciso de 2-3 frases ("summary") avaliando o perfil do candidato português.
6. Forneça uma recomendação direta acionável ("recommendation"), ex: "Avançar para entrevista presencial", "Prossiguir para teste preliminar", "Fila de espera de talentos", ou "Descartar/Baixa correspondência".

DEVOLVA APENAS JSON VÁLIDO. SEM BACKTICKS NEM MARKDOWN.
Respeite rigorosamente a ordenação e a quantidade original de candidatos.
Schema JSON de Retorno Esperado:
{
  "analysisList": [
    {
      "name": "Nome real extraído do CV ou nome provido",
      "matchScore": 88,
      "strengths": ["Ponto forte A", "Ponto forte B"],
      "gaps": ["Gap ou Lacuna A", "Gap ou Lacuna B"],
      "summary": "Resumo analítico profissional sobre a aderência.",
      "recommendation": "Ação recomendada"
    }
  ],
  "extractedField": "Setor inferido/replicado",
  "extractedSeniority": "Senioridade inferida/replicada"
}`;

    let triageResult = null;
    let actualModelUsed = "gemini-3.5-flash";

    try {
      const response = await generateContentWithRetryAndFallback(ai, {
        model: "gemini-3.5-flash",
        contents: recruiterPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    matchScore: { type: Type.INTEGER },
                    strengths: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    gaps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    summary: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                  },
                  required: ["name", "matchScore", "strengths", "gaps", "summary", "recommendation"]
                }
              },
              extractedField: { type: Type.STRING },
              extractedSeniority: { type: Type.STRING }
            },
            required: ["analysisList"]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed) {
          if (Array.isArray(parsed.analysisList)) {
            triageResult = parsed.analysisList;
          }
          if (parsed.extractedField) {
            extractedField = parsed.extractedField;
          }
          if (parsed.extractedSeniority) {
            extractedSeniority = parsed.extractedSeniority;
          }
        }
      }
    } catch (geminiError: any) {
      console.error("[Recruiter Triage Error] Gemini call failed:", geminiError.message || geminiError);
      if (isRateLimitError(geminiError)) {
        actualModelUsed = "offline";
      }
    }

    if (!triageResult) {
      console.log("[Recruiter Triage] Using fallback...");
      triageResult = getFallbackRecruiterTriage(jobRequirements, candidates);
      actualModelUsed = "offline";
    }

    res.json({
      analysisList: triageResult,
      actualModelUsed,
      extractedField,
      extractedSeniority
    });
  } catch (err: any) {
    console.error("[Recruiter Triage Main Error]:", err);
    res.status(500).json({ error: err.message || "Erro no processamento da vaga e currículos." });
  }
});

export default router;

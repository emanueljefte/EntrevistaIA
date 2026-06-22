import React, { useState, useEffect, useCallback } from "react";
import { InterviewConfig } from "../types";
import { SAMPLE_PROFILES } from "../data";

interface SetupPageProps {
  onStartInterview: (config: InterviewConfig) => void;
  isLoading: boolean;
  isGuest?: boolean;
  onRateLimitTriggered?: () => void;
  coherenceError?: string | null;
  onClearCoherenceError?: () => void;
  fallbackModelType?: "lite" | "offline" | null;
  onClearFallbackModelType?: () => void;
}

// Movido para fora do escopo do componente para evitar recriação em tempo de render
const getDefaultJobRequirements = (f: string, lvl: string) => {
  switch (f) {
    case "Tech":
      return `Vaga: Engenheiro de Software ${lvl}
Requisitos:
- Desenvolvimento de aplicações robustas e escaláveis
- Forte conhecimento em TypeScript, React, APIs RESTful
- Experiência prática na metodologia STAR e em otimização de performance técnica de sistemas
- Boas práticas de arquitetura de software e testes`;
    case "Negócios":
      return `Vaga: Product Manager ${lvl}
Requisitos:
- Gestão do ciclo de vida de produtos digitais, métricas e OKRs
- Experiência em Product Discovery e validação de hipóteses com usuários
- Excelente comunicação para facilitação de alinhamentos e tomadas de decisão
- Priorização estratégica de backlogs e roadmap`;
    case "Design":
      return `Vaga: UI/UX Designer ${lvl}
Requisitos:
- Criação de wireframes, fluxos de usuários e protótipos em alta fidelidade no Figma
- Domínio de Design Systems escaláveis e consistência visual
- Condução de pesquisas qualitativas e testes de usabilidade com usuários de verdade
- Foco em acessibilidade digital e design responsivo`;
    case "Marketing":
      return `Vaga: Especialista de Marketing / Performance ${lvl}
Requisitos:
- Gestão e otimização de campanhas de tráfego pago (Meta Ads, Google Ads)
- Análise aprofundada de funil de conversão, CAC, LTV e ROI de campanhas
- SEO (Search Engine Optimization) e produção técnica de conteúdos estratégicos
- Testes A/B e tomada de decisões baseada estritamente em analytics`;
    case "Contabilidade":
      return `Vaga: Analista de Contabilidade / Controller ${lvl}
Requisitos:
- Conciliação contábil e fiscal de alta complexidade
- Domínio prático em normas CPC / IFRS
- Fechamento de balancetes mensais e elaboration de relatórios gerenciais e DRE
- Atuação pragmática frente a auditorias internas e externas`;
    case "Telecomunicações":
      return `Vaga: Engenheiro de Telecomunicações ${lvl}
Requisitos:
- Conhecimento em radiofrequência, propagação e enlaces de transmissão óptica/rádio
- Configuração de QoS (Quality of Service), monitoramento de telemetria e Engenharia de Tráfego
- Diagnóstico avançado de latência, jitter, perda de pacotes e contingenciamento de rede
- Familiaridade com tecnologias móveis como 5G e LTE`;
    case "Enfermagem":
      return `Vaga: Enfermeiro ${lvl}
Requisitos:
- Triagem clínica de pacientes e protocolo de Manchester sob alto fluxo hospitalar
- Controle rigoroso de biossegurança e prevenção de infecção hospitalar
- Gestão de prontuários eletrônicos e administração segura de farmacológicos
- Prática de atendimento humanizado, empático e acolhedor a familiares e pacientes`;
    default:
      return `Vaga: Profissional ${lvl} em ${f}
Requisitos chave:
- Alto nível de engajamento operacional e postura ética de trabalho
- Resolução ágil de conflitos e visão estruturada de processos com entrega quantitativa
- Trabalho fluido em equipas multidisciplinares`;
  }
};

export default function SetupPage({
  onStartInterview,
  isLoading,
  isGuest = false,
  onRateLimitTriggered,
  coherenceError = null,
  onClearCoherenceError,
  fallbackModelType = null,
  onClearFallbackModelType
}: SetupPageProps) {
  const [field, setField] = useState("Tech");
  const [experienceLevel, setExperienceLevel] = useState("Sênior");
  const [language, setLanguage] = useState("Português");
  const [cvText, setCvText] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [parsingWarning, setParsingWarning] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [analysisMethod] = useState("ATL (Triagem de Currículos)");
  const [jobRequirements, setJobRequirements] = useState(() => getDefaultJobRequirements("Tech", "Sênior"));
  const [onlyCvAnalysis, setOnlyCvAnalysis] = useState(false);
  const [hasManuallyEditedRequirements, setHasManuallyEditedRequirements] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [insights, setInsights] = useState<{ title: string; description: string; trend: boolean }[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Limpa erros de validação e coerência ao alterar estados principais
  useEffect(() => {
    if (coherenceError && onClearCoherenceError) {
      onClearCoherenceError();
    }
    setValidationError(null);
  }, [field, experienceLevel, cvText, jobRequirements, coherenceError, onClearCoherenceError]);
  
  // Atualiza automaticamente os requisitos se o usuário não tiver feito edições manuais
  useEffect(() => {
    if (!hasManuallyEditedRequirements) {
      setJobRequirements(getDefaultJobRequirements(field, experienceLevel));
    }
  }, [field, experienceLevel, hasManuallyEditedRequirements]);

  // Carrega dinamicamente os insights do segmento selecionado
  useEffect(() => {
    let active = true;
    const fetchInsights = async () => {
      try {
        setInsightsLoading(true);
        const res = await fetch(`/api/insights?category=${encodeURIComponent(field)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.isRateLimited && onRateLimitTriggered) {
          onRateLimitTriggered();
        }
        if (active && data.insights) {
          setInsights(data.insights);
        }
      } catch (err) {
        console.warn("Retrying insights load from server offline pool:", err);
        if (active) {
          setInsights([
            {
              title: "Falta de Internet",
              description: "Verifique sua conexão externa. Exibindo insights offline para seu avanço.",
              trend: false,
            },
          ]);
        }
      } finally {
        if (active) {
          setInsightsLoading(false);
        }
      }
    };

    fetchInsights();
    return () => { active = false; };
  }, [field, onRateLimitTriggered]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedCv = cvText.trim();
    if (!trimmedCv) {
      setValidationError("Por favor, preencha o seu Currículo. Você pode arrastar um PDF/Word no painel de upload ou simplesmente colar as informações textuais do seu resumo de experiências no campo inferior antes de começar.");
      setTimeout(() => {
        document.getElementById("validation-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    if (hasManuallyEditedRequirements && !jobRequirements.trim()) {
      setValidationError("As especificações customizadas da vaga estão vazias. Por favor, detalhe os limites de atuação técnicos ou clique no botão 'Restaurar Padrão ✨' para preenchimento ágil.");
      setTimeout(() => {
        document.getElementById("validation-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    onStartInterview({
      apiKey: "",
      field,
      experienceLevel,
      language,
      cvText: trimmedCv,
      cvFileName,
      analysisMethod,
      jobRequirements,
      onlyCvAnalysis: !isGuest && onlyCvAnalysis,
    });
  };

  const handleSelectSample = (profile: typeof SAMPLE_PROFILES[0]) => {
    setField(profile.field);
    setExperienceLevel(profile.level);
    setCvText(profile.cvText);
    setCvFileName(profile.name);
    setParsingError(null);
    setParsingWarning(null);
    setHasManuallyEditedRequirements(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;
    
    setParsingError(null);
    setParsingWarning(null);
    
    const isImage = file.type.startsWith("image/") || /\.(gif|jpe?g|png|webp|bmp|svg|tiff?)$/i.test(file.name);
    if (isImage) {
      setCvFileName(file.name);
      setCvText("");
      setParsingError(
        "Upload de imagem rejeitado. Não é permitido carregar imagens (como PNG, JPG, JPEG, WEBP, etc.) para o currículo. A Dra. Ana Martins precisa extrair o conteúdo textual para personalizar a sua entrevista de forma precisa. Por favor, faça o upload de um arquivo PDF com texto selecionável, um arquivo Word (.docx), um arquivo de extensão .txt ou digite os dados manualmente no campo abaixo."
      );
      return;
    }

    setCvFileName(file.name);
    setIsParsing(true);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === "pdf") {
        const arrayBuffer = await file.arrayBuffer();
        let pdfjs: any;
        try {
          pdfjs = await import("pdfjs-dist");
          const pdfjsVersion = pdfjs.version || "6.0.227";
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
        } catch {
          pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/+esm");
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
        }

        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }

        const trimmedText = fullText.trim();
        if (!trimmedText || trimmedText.length < 25) {
          setCvText("");
          setParsingWarning("Não foi possível extrair nenhum texto selecionável deste arquivo PDF. Isso é comum em currículos exportados como imagem por editores como Photoshop, Illustrator ou Canva.");
        } else {
          setCvText(trimmedText);
        }
      } else if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result?.value) {
          const trimmedText = result.value.trim();
          if (trimmedText.length < 25) {
            setCvText("");
            setParsingWarning("O arquivo Word (.docx) parece estar vazio ou possui conteúdo textual legível insuficiente.");
          } else {
            setCvText(trimmedText);
          }
        } else {
          setCvText("");
          setParsingError("Não foi possível extrair o texto do arquivo Word (.docx). Certifique-se de que o arquivo não está protegido por senha.");
        }
      } else if (extension === "txt") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            if (text.trim().length < 15) setParsingWarning("O arquivo de texto (.txt) possui baixíssima quantidade de caracteres.");
            setCvText(text.trim());
          } else {
            setParsingError("O arquivo de texto selecionado está vazio.");
          }
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text && text.length >= 25) {
            setCvText(text.trim());
            setParsingWarning(`Arquivo de formato .${extension} não é homologado, mas tentamos ler seu texto bruto.`);
          } else {
            setParsingError(`A extensão de arquivo .${extension} não é suportada. Envie um arquivo PDF, Word ou TXT.`);
          }
        };
        reader.readAsText(file);
      }
    } catch (e: any) {
      console.error("File parsing error: ", e);
      setParsingError(`Falha ao processar o arquivo. Erro técnico: ${e?.message || e}. Sugerimos copiar e colar os dados manualmente.`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-8">
      <div className="mb-2 text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 font-display">
          Configuração da Simulação
        </h1>
        <p className="font-medium text-slate-500 dark:text-slate-400">
          Prepare o ambiente para sua triagem técnica e comportamental guiada pela Dra. Ana Martins.
        </p>
      </div>

      {isGuest && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-4 shadow-sm text-left">
          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 font-bold select-none mt-0.5">info</span>
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-indigo-900 dark:text-indigo-300">Modo Convidado: Análise Técnica do Currículo</span>
            <span className="text-indigo-700 dark:text-indigo-400 leading-relaxed font-semibold">
              Você receberá a triagem direta do seu currículo pela IA. Para simular e conversar interativamente de viva voz com a Dra. Ana Martins, registre-se ou entre em sua conta!
            </span>
          </div>
        </div>
      )}

      {validationError && (
        <div id="validation-error-alert" className="p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-3xl flex items-start gap-4 shadow-md relative text-left">
          <span className="material-symbols-outlined text-rose-500 font-bold select-none text-2xl mt-0.5 shrink-0">warning</span>
          <div className="flex-1 pr-6 flex flex-col gap-1.5">
            <h3 className="text-sm font-bold text-rose-950 dark:text-rose-300">Ação Necessária 🚨</h3>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold leading-relaxed">{validationError}</p>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
            aria-label="Dispensar aviso"
          >
            <span className="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>
      )}

      {fallbackModelType && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-3xl flex items-start gap-4 shadow-xs relative text-left">
          <span className="material-symbols-outlined text-amber-500 font-bold select-none text-2xl mt-0.5 shrink-0">warning</span>
          <div className="flex-1 pr-6 flex flex-col gap-1.5">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">Aviso de Cota do Modelo 🚨</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
              {fallbackModelType === "lite" 
                ? "O modelo principal está temporariamente com alto tráfego. Ativamos o modelo inteligente auxiliar (Gemini Flash Lite) para que sua simulação prossiga sem lentidões!"
                : "Seu processamento foi redirecionado para o nosso motor inteligente complementar para garantir rapidez."
              }
            </p>
          </div>
          {onClearFallbackModelType && (
            <button
              type="button"
              onClick={onClearFallbackModelType}
              className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors p-1 cursor-pointer"
              aria-label="Dispensar aviso"
            >
              <span className="material-symbols-outlined text-sm font-bold">close</span>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 text-left bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <label className="font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-indigo-500">hotel_class</span>
          Preenchimento Rápido com Perfis de Teste
        </label>
        <p className="text-[11px] text-slate-500 font-semibold mb-1">
          Selecione um perfil de exemplo para testar as capacidades instantaneamente com dados fictícios:
        </p>
        <div className="flex flex-wrap gap-2.5">
          {SAMPLE_PROFILES.map((profile, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(profile)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              {profile.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleStart} className="flex flex-col gap-8 text-left">
        
        {/* PASSO 1 */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-display font-extrabold flex items-center justify-center text-sm shadow-md">1</span>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white font-display">Vaga Alvo & Requisitos</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">Defina o foco setorial e os critérios técnicos da simulação</p>
            </div>
          </div>

          {hasManuallyEditedRequirements && (
            <div className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-start gap-2.5 leading-relaxed">
              <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
              <span>A Área e o Nível de Experiência foram travados porque você editou os Requisitos manualmente. Clique em <b>"Restaurar Padrão ✨"</b> para reativá-los.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Área de Atuação</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                disabled={hasManuallyEditedRequirements}
                className={`w-full border rounded-xl py-3 px-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 appearance-none bg-no-repeat bg-[right_1rem_center] cursor-pointer transition-all font-semibold text-sm ${
                  hasManuallyEditedRequirements
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-indigo-600"
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234F46E5%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E")`,
                }}
              >
                <option value="Tech">Tech / Engenharia de Software</option>
                <option value="Negócios">Negócios / Gestão de Produto</option>
                <option value="Design">Design UX/UI / Produto</option>
                <option value="Marketing">Marketing / Performance</option>
                <option value="Contabilidade">Contabilidade / Controladoria</option>
                <option value="Telecomunicações">Telecomunicações / Redes</option>
                <option value="Enfermagem">Enfermagem / Saúde Hospitalar</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nível de Experiência</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                disabled={hasManuallyEditedRequirements}
                className={`w-full border rounded-xl py-3 px-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 appearance-none bg-no-repeat bg-[right_1rem_center] cursor-pointer transition-all font-semibold text-sm ${
                  hasManuallyEditedRequirements
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-indigo-600"
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234F46E5%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E")`,
                }}
              >
                <option value="Júnior">Júnior</option>
                <option value="Pleno">Pleno</option>
                <option value="Sênior">Sênior</option>
                <option value="Especialista/Lead">Especialista / Lead</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Idioma da Entrevistadora</span>
              {isGuest && <span className="text-[10px] text-indigo-400 font-black normal-case">*indisponível em modo convidado</span>}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isGuest}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-600 rounded-xl py-3 px-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 appearance-none bg-no-repeat bg-[right_1rem_center] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234F46E5%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E")`,
              }}
            >
              <option value="Português">Português (Brasil)</option>
              <option value="Português (Angola)">Português (Angola) 🇦🇴</option>
              <option value="Inglês">Inglês (Estados Unidos / Internacional)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Requisitos e Detalhes Práticos da Vaga</label>
              {hasManuallyEditedRequirements && (
                <button
                  type="button"
                  onClick={() => {
                    setJobRequirements(getDefaultJobRequirements(field, experienceLevel));
                    setHasManuallyEditedRequirements(false);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-extrabold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">restart_alt</span>
                  Restaurar Padrão ✨
                </button>
              )}
            </div>

            <textarea
              value={jobRequirements}
              onChange={(e) => {
                setJobRequirements(e.target.value);
                setHasManuallyEditedRequirements(true);
              }}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all text-xs font-semibold"
              placeholder="Descreva aqui as qualificações, ferramentas ou detalhes pretendidos da vaga..."
            />
          </div>

          {/* Insights Corporativos */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-1 bg-slate-50/50 dark:bg-slate-950/25">
            <button
              type="button"
              onClick={() => setInsightsExpanded(!insightsExpanded)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg font-bold">tips_and_updates</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Insights Corporativos do Segmento ({field})</span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${insightsExpanded ? "rotate-180" : ""}`}>expand_more</span>
            </button>
            
            {insightsExpanded && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">As orientações abaixo guiarão as avaliações no currículo:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {insightsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-slate-100/35 border border-slate-200 rounded-xl p-4 flex flex-col gap-2 animate-pulse">
                        <div className="h-3.5 bg-slate-200 rounded w-2/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                      </div>
                    ))
                  ) : (
                    insights.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                        <div className="flex flex-col gap-1.5 text-left">
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs leading-snug">{item.title}</h4>
                          <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">{item.description}</p>
                        </div>
                        <div>
                          {item.trend ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping"></span>
                              Tendência 2026
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Consolidado</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PASSO 2 */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-display font-extrabold flex items-center justify-center text-sm shadow-md">2</span>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white font-display">Seu Currículo Profissional</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">Forneça os dados de sua carreira e competências</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Upload do Arquivo de Currículo</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-colors cursor-pointer group bg-slate-50/50 dark:bg-slate-950/20 ${
                dragActive ? "border-indigo-600 bg-indigo-50/20" : "border-slate-200 dark:border-slate-800 hover:border-indigo-500"
              }`}
            >
              <span className={`material-symbols-outlined text-3xl transition-colors ${dragActive ? "text-indigo-600 animate-bounce" : "text-slate-400 dark:text-slate-600 group-hover:text-indigo-600"}`}>cloud_upload</span>
              <p className="text-slate-500 dark:text-slate-400 text-xs group-hover:text-slate-800 transition-colors text-center px-4 font-semibold leading-relaxed">
                {cvFileName ? `Arquivo Selecionado: ${cvFileName}` : "Arraste seu currículo (.pdf, .docx, .txt) aqui ou clique para buscar arquivo"}
              </p>
              <input id="file-input" accept=".txt,.pdf,.docx" className="hidden" type="file" onChange={handleFileChange} />
            </div>

            {isParsing && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
                <svg className="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.142 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Lendo e interpretando currículo automaticamente...</span>
              </div>
            )}

            {parsingError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 shadow-xs text-left">
                <span className="material-symbols-outlined text-rose-500 font-bold select-none mt-0.5">error</span>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-rose-900 dark:text-rose-300">Falha na leitura automática do PDF/Word</span>
                  <span className="text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">{parsingError}</span>
                  <span className="mt-2 text-rose-800 dark:text-rose-350 font-bold flex items-center gap-1 font-mono text-[10px]">💡 Conselho: Digite ou cole suas experiências profissionais logo abaixo!</span>
                </div>
              </div>
            )}

            {parsingWarning && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3 shadow-xs text-left">
                <span className="material-symbols-outlined text-amber-500 font-bold select-none mt-0.5">warning</span>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300">Aviso: PDF escaneado (imagem / sem texto selecionável)</span>
                  <span className="text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">{parsingWarning}</span>
                  <span className="mt-2 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 font-mono text-[10px]">💡 Dica: Copiar as experiências do seu perfil e colar abaixo tornará o parecer muito melhor!</span>
                </div>
              </div>
            )}

            {!isParsing && !parsingError && !parsingWarning && cvFileName && cvText && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/55 rounded-2xl flex items-start gap-3 shadow-xs text-left">
                <span className="material-symbols-outlined text-emerald-500 font-bold select-none mt-0.5">check_circle</span>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300">Sucesso na leitura do Currículo!</span>
                  <span className="text-emerald-700 dark:text-emerald-400 leading-relaxed font-semibold">Os textos de <strong>"{cvFileName}"</strong> foram carregados com fidelidade.</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
            <span className="text-slate-400 dark:text-slate-600 font-extrabold text-[10px] tracking-widest uppercase">OU</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cole o texto de seu Currículo ou Resumo Profissional</label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-4 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all font-mono text-xs leading-relaxed"
              placeholder="Cole aqui textos estruturados, conquistas, histórico de empresas, certificações..."
              rows={5}
            />
          </div>
        </section>

        {/* PASSO 3 */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-display font-extrabold flex items-center justify-center text-sm shadow-md">3</span>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white font-display">Formato de Execução & Início</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">Escolha como deseja rodar a simulação e obter feedback</p>
            </div>
          </div>

          {isGuest ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-500 font-bold select-none mt-0.5">key</span>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300">Modo Convidado: Restrito à Triagem Manual</span>
                  <span className="text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">
                    Simulações com chat interativo utilizam processamento exclusivo para membros. Você receberá um parecer rápido de triagem direta em menos de 10 segundos.
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-300">🔒 Quer bater papo com a Dra. Ana e treinar para entrevista real?</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("auth_guest_v1");
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-98"
                >
                  Registrar / Login
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-indigo-500">alt_route</span>
                Selecione o Formato que Deseja Iniciar:
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOnlyCvAnalysis(false)}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 cursor-pointer outline-none transition-all duration-300 relative overflow-hidden select-none active:scale-[0.99] ${
                    !onlyCvAnalysis
                      ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/10"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-indigo-500">forum</span>
                      Entrevista por Chat de Voz
                    </span>
                    {!onlyCvAnalysis && <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">✓</span>}
                  </div>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Simulação comportamental & técnica interativa. A Dra. Ana Martins questionará você e avaliará cada resposta.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyCvAnalysis(true)}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 cursor-pointer outline-none transition-all duration-300 relative overflow-hidden select-none active:scale-[0.99] ${
                    onlyCvAnalysis
                      ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/10"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-indigo-500">quick_reference_all</span>
                      Apenas Triagem Direta do CV
                    </span>
                    {onlyCvAnalysis && <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">✓</span>}
                  </div>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Pule a sabatina de perguntas e receba na hora um relatório completo com sua nota, pontos de força e correções de currículo.
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 active:scale-[0.985] transition-all py-4.5 rounded-2xl text-white font-display text-base flex items-center justify-center gap-2 group shadow-lg cursor-pointer font-extrabold select-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.142 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{onlyCvAnalysis || isGuest ? "Dra. Ana está analisando currículo..." : "Preparando simulação inteligente..."}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-display uppercase tracking-wider text-sm">
                  {onlyCvAnalysis || isGuest ? (
                    <>
                      <span className="material-symbols-outlined text-base">analytics</span>
                      Analisar Currículo Imediatamente 📋🚀
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">forum</span>
                      Iniciar Entrevista Inteligente 💬🚀
                    </>
                  )}
                </div>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
              Ao iniciar, seus dados curriculares e respostas serão processados éticamente pelo motor de inteligência artificial em conformidade com as diretrizes de recrutamento.
            </p>
          </div>
        </section>
      </form>
    </div>
  );
}
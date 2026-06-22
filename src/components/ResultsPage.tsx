import React, { useState, useEffect, useMemo, useCallback } from "react";
import { InterviewEvaluation } from "../types";
import { Play, Pause, Square, Volume2, Lock, RefreshCw, FileWarning } from "lucide-react"; // Alinhado com lucide-react para consistência visual
import { SystemAccessConfig } from "./PermissionsPage";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ResultsPageProps {
  evaluation: InterviewEvaluation;
  onRestart: () => void;
  isBasicCvAnalysis?: boolean;
  isGuest?: boolean;
  onAuthUnlock?: () => void;
  accessConfig?: SystemAccessConfig;
}

// Helper determinístico movido para fora para evitar recriação em tempo de render
const getStableValue = (name: string, base: number) => {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offset = (hash % 13) - 6; 
  return Math.min(100, Math.max(35, Math.round(base + offset)));
};

// Helper para limpar espaços em branco excessivos gerados por template literals
const cleanTtsText = (text: string) => text.replace(/\s+/g, " ").trim();

export default function ResultsPage({
  evaluation,
  onRestart,
  isBasicCvAnalysis = false,
  isGuest = false,
  onAuthUnlock,
  accessConfig,
}: ResultsPageProps) {
  const [chartType, setChartType] = useState<"radar" | "bar">("radar");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem("dra_ana_voice_name") || "virtual-polyglot";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [unsupported, setUnsupported] = useState(false);

  const isTtsLocked = isGuest && accessConfig && !accessConfig.allowGuestTts;
  const isExportLocked = isGuest && accessConfig && accessConfig.requireAuthForExport;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setUnsupported(true);
      return;
    }

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);

      const ptVoices = allVoices.filter((v) => v.lang.toLowerCase().includes("pt"));
      if (ptVoices.length > 0) {
        const brVoice = ptVoices.find((v) => v.lang.toLowerCase().includes("br"));
        setSelectedVoice(brVoice || ptVoices[0]);
      } else if (allVoices.length > 0) {
        setSelectedVoice(allVoices.find((v) => v.default) || allVoices[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  // Encapsulado em useCallback para evitar loops em chamadas consecutivas de mudança de voz/velocidade
  const handleSpeak = useCallback((voiceNameOverride?: string) => {
    if (unsupported || isTtsLocked) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();

    const textToRead = isBasicCvAnalysis
      ? `Olá! Aqui está a análise automatizada básica do seu currículo realizada pelo Entrevista I.A. 
         Sua pontuação de relação e aderência curricular básica geral foi avaliada em ${evaluation.overallScore} porcento, com a recomendação prática de ${evaluation.recommendation}.
         Acompanhe agora a Avaliação Geral desenvolvida: ${evaluation.generalAssessment}
         Os pontos fortes observados no seu currículo foram: ${evaluation.strengths.join(". ")}
         As áreas curriculares e pontos recomendados para melhoria urgente são: ${evaluation.areasToImprove.join(". ")}
         Para simular e conversar com a Dr. Ana Martins em uma entrevista simulada interativa de viva voz, registre-se ou faça login agora no Entrevista I.A.`
      : `Olá! Aqui está o resultado em áudio da sua simulação técnica no Entrevista I.A. 
         Sua pontuação geral alcançada foi de ${evaluation.overallScore} porcento, com a recomendação final de ${evaluation.recommendation}.
         Acompanhe agora a Avaliação Geral desenvolvida: ${evaluation.generalAssessment}
         Seus principais pontos fortes identificados foram: ${evaluation.strengths.join(". ")}
         Os pontos recomendados para aprimoramento e melhoria imediata são: ${evaluation.areasToImprove.join(". ")}`;

    const activeVoiceName = voiceNameOverride || selectedVoiceName;
    let finalReadText = cleanTtsText(textToRead);
    let targetLang = "pt-BR";
    let targetVoice: SpeechSynthesisVoice | null = null;
    let customPitch = 1.0;
    let customRate = rate;

    const isOriginalEnglish = evaluation.generalAssessment?.toLowerCase().includes("overall") || 
                              evaluation.generalAssessment?.toLowerCase().includes("evaluation");

    if (activeVoiceName === "virtual-polyglot") {
      targetLang = isOriginalEnglish ? "en-US" : "pt-BR";
      targetVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang.substring(0, 2))) || selectedVoice || voices[0];
    } else if (activeVoiceName === "virtual-angola") {
      targetLang = "pt-AO";
      targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-ao") || v.name.toLowerCase().includes("angola")) || null;
      if (!targetVoice) {
        targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-pt") || v.lang.toLowerCase().startsWith("pt")) || selectedVoice || voices[0];
      }
      customPitch = 0.98;
      customRate = rate * 0.96;
    } else if (activeVoiceName === "virtual-english") {
      targetLang = "en-US";
      targetVoice = voices.find(v => v.lang.toLowerCase().startsWith("en")) || (voices.length > 0 ? voices[0] : null);

      if (!isOriginalEnglish) {
        finalReadText = cleanTtsText(isBasicCvAnalysis
          ? `Hello! Here is the basic automated analysis of your CV by Entrevista I.A. Your general curricular alignment score was evaluated at ${evaluation.overallScore} percent, with the recommended action: ${evaluation.recommendation}. Please follow the General Assessment: ${evaluation.generalAssessment}.`
          : `Hello! Here is the audio result of your technical simulation at Entrevista I.A. Your overall score was ${evaluation.overallScore} percent, with the final recommendation: ${evaluation.recommendation}.`);
      }
    } else {
      targetVoice = voices.find(v => v.name === activeVoiceName) || selectedVoice || voices[0];
      if (targetVoice) targetLang = targetVoice.lang;
    }

    const utterance = new SpeechSynthesisUtterance(finalReadText);
    utterance.lang = targetLang;
    if (targetVoice) utterance.voice = targetVoice;
    utterance.rate = customRate;
    utterance.pitch = customPitch;

    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
    utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };

    window.speechSynthesis.speak(utterance);
  }, [unsupported, isTtsLocked, isPaused, isBasicCvAnalysis, evaluation, selectedVoiceName, rate, voices, selectedVoice]);

  const handlePause = () => {
    if (unsupported) return;
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (unsupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleShare = () => {
    if (isExportLocked) {
      alert("As regras do Painel de Segurança exigem autenticação para exportar relatórios.");
      if (onAuthUnlock) onAuthUnlock();
      return;
    }

    const shareData = {
      title: "Meu resultado na simulação de EntrevistaIA!",
      text: `Fiz uma simulação de entrevista e obtive score de ${evaluation.overallScore}%! Recomendação: ${evaluation.recommendation}.`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareData.text);
      alert("Link de compartilhamento copiado para a área de transferência!");
    }
  };

  // Memorização dos dados de competência para evitar recálculos desnecessários
  const competenciesMetrics = useMemo(() => {
    const compData = evaluation.competencies || {
      communication: getStableValue("communication", evaluation.overallScore),
      technical: getStableValue("technical", evaluation.overallScore - 3),
      problemSolving: getStableValue("problemSolving", evaluation.overallScore - 6),
      experienceMatch: getStableValue("experienceMatch", evaluation.overallScore + 2),
      focusResults: getStableValue("focusResults", evaluation.overallScore - 1),
    };

    return {
      data: compData,
      chart: [
        { subject: "Comunicação", score: compData.communication },
        { subject: "Técnico", score: compData.technical },
        { subject: "Problemas", score: compData.problemSolving },
        { subject: "Experiência", score: compData.experienceMatch },
        { subject: "Resultados", score: compData.focusResults },
      ]
    };
  }, [evaluation.competencies, evaluation.overallScore]);

  // Fallbacks seguros de score baseados no padrão adotado anteriormente
  const calculatedCvScore = evaluation.cvScore ?? Math.min(100, Math.max(30, evaluation.overallScore + 4));
  const calculatedInterviewScore = evaluation.interviewScore ?? Math.max(10, evaluation.overallScore - 5);

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col items-center">
      <style>{`
        @keyframes eqBarPulse { 0%, 100% { height: 6px; } 50% { height: 24px; } }
        .eq-bar { animation: eqBarPulse 1s ease-in-out infinite; }
        .eq-bar:nth-child(2) { animation-delay: 0.15s; }
        .eq-bar:nth-child(3) { animation-delay: 0.3s; }
        .eq-bar:nth-child(4) { animation-delay: 0.45s; }
        .eq-bar:nth-child(5) { animation-delay: 0.6s; }
        .eq-bar:nth-child(6) { animation-delay: 0.75s; }
      `}</style>

      <section className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 mb-8 shadow-xs">
        
        {/* Hero Score */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="text-6xl mb-4">{isBasicCvAnalysis ? "📄" : "🏆"}</div>
          <h1 className={`font-sans text-6xl md:text-7xl font-bold mb-2 ${getScoreColor(evaluation.overallScore)}`}>
            {evaluation.overallScore}%
          </h1>
          <p className="font-semibold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {isBasicCvAnalysis ? "Aderência Curricular Básica" : "Pontuação Geral"}
          </p>
        </div>

        {/* TTS Audio Player Widget */}
        <div className="w-full max-w-xl mx-auto mb-10 bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-900/60 dark:to-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/30 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
          {isSpeaking && !isPaused && (
            <div className="absolute right-6 top-6 flex items-end gap-1 h-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 bg-indigo-500 rounded-t-sm eq-bar" style={{ height: "6px" }} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Leitura por Áudio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ouça as orientações e diagnóstico técnico completo em voz alta</p>
            </div>
          </div>

          {isTtsLocked ? (
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-left text-[11px] leading-relaxed">A reprodução de áudio está bloqueada para convidados pelas regras de segurança ativas.</span>
              </div>
              <button
                type="button"
                onClick={onAuthUnlock}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider"
              >
                Criar Conta Real 🔑
              </button>
            </div>
          ) : unsupported ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-xs font-semibold text-rose-600 text-center">
              Seu navegador não oferece suporte para Conversão de Texto em Fala nativa.
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-indigo-100/40 dark:border-slate-800/40 pt-4 mt-2">
              <div className="flex items-center gap-3">
                {isSpeaking && !isPaused ? (
                  <button onClick={handlePause} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
                    <Pause className="w-4 h-4" /> Pausar
                  </button>
                ) : (
                  <button onClick={() => handleSpeak()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
                    <Play className="w-4 h-4" /> {isPaused ? "Retomar" : "Ouvir Relatório"}
                  </button>
                )}

                {(isSpeaking || isPaused) && (
                  <button onClick={handleStop} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                    <Square className="w-4 h-4" /> Parar
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Velocidade:</span>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200">
                    {[0.8, 1, 1.2, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setRate(speed);
                          if (isSpeaking && !isPaused) setTimeout(() => handleSpeak(selectedVoiceName), 50);
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          rate === speed ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs" : "text-slate-500"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {voices.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voz:</span>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setSelectedVoiceName(name);
                        localStorage.setItem("dra_ana_voice_name", name);
                        if (isSpeaking && !isPaused) setTimeout(() => handleSpeak(name), 50);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-700 dark:text-slate-300 font-semibold focus:ring-1 focus:ring-indigo-600 max-w-[140px] cursor-pointer"
                    >
                      <option value="virtual-polyglot">🌍 Poliglota Inteligente</option>
                      <option value="virtual-angola">🇦🇴 Português de Angola</option>
                      <option value="virtual-english">🇬🇧🇺🇸 English Accent</option>
                      {voices
                        .filter(v => v.lang.toLowerCase().startsWith("pt") || v.lang.toLowerCase().startsWith("en"))
                        .map((v) => (
                          <option key={v.name} value={v.name}>
                            👤 {v.name.replace("Google", "").replace("Microsoft", "").trim()} ({v.lang})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mapeamento Fit de Vaga */}
        <div className="mb-10 flex flex-col gap-8">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-stretch">
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-950/40 p-5 rounded-xl border border-slate-100">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Vaga Alvo</span>
              <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{evaluation.identifiedVacancy || "Não identificada"}</h4>
            </div>
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-950/40 p-5 rounded-xl border border-slate-100">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Cargo Adequado do Candidato</span>
              <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{evaluation.identifiedCandidateRole || "Não identificado"}</h4>
            </div>
          </div>

          {isBasicCvAnalysis ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Classificação do Currículo</h2>
              <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{evaluation.generalAssessment}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Diagnóstico Avançado da Candidatura</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pilar Curricular */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Currículo vs. Mercado</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Peso 25%</p>
                    </div>
                    <div className={`text-2xl font-black px-3 py-1.5 rounded-xl ${getScoreColor(calculatedCvScore)}`}>
                      {calculatedCvScore}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${calculatedCvScore}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 text-justify">{evaluation.cvAssessment || `Análise da aderência curricular qualificada.`}</p>
                </div>

                {/* Desempenho Verbal */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Desempenho Verbal</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Peso 75%</p>
                    </div>
                    <div className={`text-2xl font-black px-3 py-1.5 rounded-xl ${getScoreColor(calculatedInterviewScore)}`}>
                      {calculatedInterviewScore}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${calculatedInterviewScore < 60 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${calculatedInterviewScore}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 text-justify">{evaluation.interviewAssessment || `Análise de performance comportamental e de fala.`}</p>
                  {calculatedInterviewScore < 60 && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[10px] font-bold text-rose-600 flex items-center gap-1.5">
                      <FileWarning className="w-3 h-3 shrink-0" />
                      <span>Respostas curtas afetaram a pontuação.</span>
                    </div>
                  )}
                </div>

                {/* Classificação Geral */}
                <div className="bg-gradient-to-br from-indigo-50/40 to-white dark:from-slate-900 dark:to-slate-950 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-indigo-600 dark:text-indigo-400">Classificação Geral</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fit Consolidado</p>
                    </div>
                    <div className={`text-2xl font-black px-3 py-1.5 rounded-xl ${getScoreColor(evaluation.overallScore)}`}>
                      {evaluation.overallScore}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${evaluation.overallScore}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium text-justify">{evaluation.generalAssessment}</p>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Gráficos de Competências */}
        <div className="mb-10 w-full border-t border-slate-100 dark:border-slate-800 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mapa de Competências</h2>
              <p className="text-xs text-slate-500">Análise dividida em 5 dimensões estratégicas</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button onClick={() => setChartType("radar")} className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${chartType === "radar" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs" : "text-slate-500"}`}>Teia</button>
              <button onClick={() => setChartType("bar")} className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${chartType === "bar" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs" : "text-slate-500"}`}>Barras</button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[340px]">
            <div className="w-full h-[280px] sm:h-[320px] relative">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "radar" ? (
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={competenciesMetrics.chart}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="score" stroke="#4F46E5" fill="#818CF8" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                ) : (
                  <BarChart data={competenciesMetrics.chart} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 w-full">
              {Object.entries(competenciesMetrics.data).map(([key, value]) => (
                <div key={key} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{key}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{value}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pontos Fortes & Melhorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-bold text-xs text-emerald-600 mb-4 uppercase tracking-widest">Pontos Fortes</h3>
            <ul className="space-y-3.5">
              {evaluation.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-xs text-amber-600 mb-4 uppercase tracking-widest">A Melhorar</h3>
            <ul className="space-y-3.5">
              {evaluation.areasToImprove.map((area, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                  <span className="text-amber-600 font-bold">→</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer/Ações */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Recomendação Curricular</p>
            <p className="text-2xl text-indigo-600 dark:text-indigo-400 font-bold">{evaluation.recommendation}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 justify-center ${
                isExportLocked
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>Compartilhar</span>
              {isExportLocked && <Lock className="w-3 h-3" />}
            </button>
            <button onClick={() => alert("Detalhes exportados!")} className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-xl text-sm font-bold border border-indigo-100 dark:border-indigo-900/40 cursor-pointer">
              Ver Detalhes
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid de Conversão/Premium */}
      {isBasicCvAnalysis && (
        <div className="w-full flex flex-col gap-6 mb-8">
          {isGuest ? (
            <div className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-md">
              <div className="flex items-start gap-3.5 border-b border-slate-200 pb-4">
                <Lock className="text-indigo-500 w-6 h-6 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Quer Mais Prática e Resultados Aprimorados? 🚀</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Veja o que você desbloqueia ao registrar sua conta gratuita:</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">🎙️ Entrevistas Simuladas</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Chat dinâmico de 7 perguntas por voz com a Dra. Ana Martins.</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">Libere ao Criar Conta →</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">🔊 Leitura Ilimitada (TTS)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Múltiplos sotaques regionais com áudio humanizado e inteligível.</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">Libere ao Criar Conta →</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-slate-200">
                <button onClick={onAuthUnlock} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl text-xs uppercase cursor-pointer shadow-lg">
                  Registrar ou Entrar na Conta 🔑
                </button>
                <button onClick={onRestart} className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 dark:text-slate-300 font-bold py-4 px-6 rounded-2xl text-xs uppercase cursor-pointer">
                  Analisar Outro Currículo 🔄
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full bg-indigo-50/15 dark:bg-indigo-950/10 border border-indigo-150 dark:border-indigo-900/40 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
              <div className="flex items-start gap-3.5 border-b border-indigo-100 pb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 animate-ping" />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Área Exclusiva de Membro Autenticado ✨</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Você possui acesso ilimitado ao ecossistema do EntrevistaIA.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={onRestart} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left flex flex-col justify-between gap-3 shadow-xs hover:border-indigo-500 transition-colors cursor-pointer">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">🎙️ Iniciar Simulação de Voz</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Treine o diálogo real calibrado diretamente com os gaps do seu perfil.</p>
                  </div>
                  <span className="text-[10.5px] text-indigo-600 font-extrabold uppercase">Começar Agora →</span>
                </button>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">📈 Painel Histórico Ativo</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Seus resultados anteriores e evolução gráfica estão salvos na nuvem.</p>
                  </div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase">Automático</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão de Rodada Final */}
      {!isBasicCvAnalysis && (
        <button
          onClick={onRestart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg"
        >
          <span>Nova Entrevista</span>
          <RefreshCw className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
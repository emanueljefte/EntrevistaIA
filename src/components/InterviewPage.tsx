import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InterviewConfig, Message } from "../types";
import { 
  Volume2, VolumeX, Mic, MicOff, Send, 
  SkipForward, LogOut, Sparkles, User, HelpCircle 
} from "lucide-react";

interface InterviewPageProps {
  config: InterviewConfig;
  questions: string[];
  chatHistory: Message[];
  currentQuestionIndex: number;
  onAnswerSubmit: (answerText: string) => void;
  onSkipQuestion: () => void;
  onEndInterview: (pendingText?: string) => void;
  isConfirmExitOpen: boolean;
  onSetConfirmExitOpen: (open: boolean) => void;
  isEvaluating: boolean;
  isCompilingReport?: boolean;
  isZen: boolean;
  onToggleZen: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export default function InterviewPage({
  config,
  questions,
  chatHistory,
  currentQuestionIndex,
  onAnswerSubmit,
  onSkipQuestion,
  onEndInterview,
  isConfirmExitOpen,
  onSetConfirmExitOpen,
  isEvaluating,
  isCompilingReport = false,
  isZen,
  onToggleZen,
}: InterviewPageProps) {
  const [currentTranscription, setCurrentTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [micStatus, setMicStatus] = useState<"idle" | "granted" | "denied">("idle");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Estados de Compilação do Relatório
  const [compilingPhase, setCompilingPhase] = useState(0);
  const phases = [
    "Dra. Ana Martins está revisando minuciosamente suas respostas...",
    "Estruturando suas competências sob a metodologia STAR...",
    "Analisando profundidade técnica e vocabulário corporativo...",
    "Calibrando sua nota final para o nível de experiência selecionado...",
    "Redigindo seu parecer técnico e plano de melhorias personalizadas..."
  ];

  useEffect(() => {
    if (!isCompilingReport) {
      setCompilingPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setCompilingPhase((prev) => (prev + 1) % phases.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isCompilingReport]);

  const recognitionRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem("dra_ana_muted") === "true");
  const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem("dra_ana_voice_name") || "virtual-polyglot";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, []);

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    
    const cleanedText = text.replace(/[*_#`~]/g, "").replace(/\[.*?\]\(.*?\)/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    let targetLang = "pt-BR";
    let targetVoice: SpeechSynthesisVoice | null = null;
    let customPitch = 1.0;
    let customRate = 1.05;

    if (selectedVoiceName === "virtual-polyglot") {
      const isEnglish = config.language?.toLowerCase().includes("ingl") || config.language?.toLowerCase().includes("en");
      const isAngola = config.language?.toLowerCase().includes("angola");
      
      if (isEnglish) { targetLang = "en-US"; targetVoice = voices.find(v => v.lang.toLowerCase().startsWith("en")) || null; }
      else if (isAngola) {
        targetLang = "pt-AO";
        targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-ao") || v.name.toLowerCase().includes("angola")) || null;
        if (!targetVoice) targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-pt") || v.lang.toLowerCase().startsWith("pt")) || null;
        customPitch = 0.98; customRate = 0.98;
      } else {
        targetLang = "pt-BR";
        targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-br") || v.lang.toLowerCase().startsWith("pt")) || null;
      }
    } else if (selectedVoiceName === "virtual-angola") {
      targetLang = "pt-AO";
      targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-ao") || v.name.toLowerCase().includes("angola")) || null;
      if (!targetVoice) targetVoice = voices.find(v => v.lang.toLowerCase().includes("pt-pt") || v.lang.toLowerCase().startsWith("pt")) || null;
      customPitch = 0.98; customRate = 0.98;
    } else if (selectedVoiceName === "virtual-english") {
      targetLang = "en-US";
      targetVoice = voices.find(v => v.lang.toLowerCase().startsWith("en")) || null;
    } else {
      targetVoice = voices.find(v => v.name === selectedVoiceName) || null;
      if (targetVoice) targetLang = targetVoice.lang;
    }

    utterance.lang = targetLang;
    if (targetVoice) utterance.voice = targetVoice;
    utterance.rate = customRate;
    utterance.pitch = customPitch;
    
    utterance.onstart = () => setIsCurrentlySpeaking(true);
    utterance.onend = () => setIsCurrentlySpeaking(false);
    utterance.onerror = () => setIsCurrentlySpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (chatHistory.length === 0) return;
    const interviewerMsgs = chatHistory.filter((msg) => msg.role === "interviewer");
    if (interviewerMsgs.length === 0) return;
    const lastMsg = interviewerMsgs[interviewerMsgs.length - 1];
    
    if (lastMsg.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = lastMsg.id;
      if (!isMuted) {
        const timer = setTimeout(() => speakText(lastMsg.text), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [chatHistory, isMuted]);

  useEffect(() => {
    return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  const totalQuestions = questions.length;
  const progressPercent = Math.min(100, Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, currentQuestionIndex]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = config.language === "Inglês" ? "en-US" : "pt-BR";

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        const fullText = finalTranscript || interimTranscript;
        if (fullText) setCurrentTranscription(fullText);
      };

      rec.onerror = (event: any) => {
        if (event.error === "not-allowed") setErrorMsg("Acesso ao microfone negado.");
        setIsRecording(false);
      };
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, [config.language]);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      setErrorMsg("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setErrorMsg("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicStatus("granted");
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setErrorMsg("Permissão do microfone negada.");
        setMicStatus("denied");
      }
    }
  };

  const handleSend = () => {
    if (!currentTranscription.trim()) return;
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    onAnswerSubmit(currentTranscription.trim());
    setCurrentTranscription("");
  };

  const getQuestionBadge = (index: number) => {
    if (index <= 1) return { label: "Fase 1: Alinhamento Técnico", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    if (index <= 3) return { label: "Fase 2: Vivência & Arquitetura", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    if (index <= 5) return { label: "Fase 3: Comportamental (STAR)", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    return { label: "Fase 4: Resolução de Conflitos", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  };

  const activeBadge = getQuestionBadge(currentQuestionIndex);

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 flex flex-col gap-4 transition-all duration-300 ${
      isZen ? "pt-4 h-screen" : "pt-24 h-[calc(100vh-2rem)] pb-4"
    }`}>
      
      {/* HEADER INTERATIVO DA DRª ANA */}
      <header className="w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative shrink-0">
            <img
              alt="Dra. Ana Martins"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/20"
              src="/src/assets/images/dra_ana_avatar_1781485052071.jpg"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Dra. Ana Martins</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">Sênior</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Motor de Inteligência Artificial Ativo</p>
          </div>
        </div>

        {/* CONTROLES DA SESSÃO */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
          {/* Badge de Progresso Linear */}
          <div className="flex flex-col items-end gap-1 px-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Questão {currentQuestionIndex + 1}/{totalQuestions}</span>
            <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                const n = !isMuted; setIsMuted(n); localStorage.setItem("dra_ana_muted", String(n));
                if (n) window.speechSynthesis.cancel(); else if (chatHistory.length) speakText(chatHistory[chatHistory.length - 1].text);
              }}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${isCurrentlySpeaking ? "text-indigo-600 bg-indigo-500/10 animate-pulse" : "text-slate-400 hover:text-slate-600"}`}
              title="Alternar Leitura por Voz"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            
            <button
              onClick={onToggleZen}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${isZen ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              Modo Zen
            </button>
            
            <button
              onClick={() => onSetConfirmExitOpen(true)}
              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Finalizar Simulação"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* FEED DE CHAT DINÂMICO */}
      <main className="flex-grow bg-white/40 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 md:p-6 overflow-hidden flex flex-col shadow-xs backdrop-blur-md">
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, index) => {
              const isInterviewer = msg.role === "interviewer";
              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isInterviewer ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${
                    isInterviewer ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" : "bg-indigo-600 text-white border-transparent"
                  }`}>
                    {isInterviewer ? <img src="/src/assets/images/dra_ana_avatar_1781485052071.jpg" className="w-full h-full rounded-full object-cover" /> : <User size={14} />}
                  </div>

                  <div className="flex flex-col gap-1 w-full">
                    <span className={`text-[10px] font-bold text-slate-400 ${isInterviewer ? "text-left" : "text-right"}`}>
                      {isInterviewer ? "Dra. Ana Martins" : "Você"} • {msg.timestamp}
                    </span>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed border font-medium whitespace-pre-wrap shadow-xs ${
                      isInterviewer 
                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border-slate-200 dark:border-slate-800" 
                        : "bg-indigo-600 text-white rounded-tr-none border-indigo-700"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Indicador de "Digitando..." da IA */}
          {!isRecording && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "interviewer" && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center text-xs text-slate-400 font-medium">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-indigo-500 animate-spin" />
              </div>
              <span className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl rounded-tl-none">Aguardando sua resposta técnica estruturada...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ÁREA DE ENTRADA & DIGITAÇÃO PREMIUM */}
      <footer className="flex flex-col gap-3">
        <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 transition-all ${
          isRecording ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10"
        }`}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              {isRecording ? <Mic size={12} className="text-emerald-500 animate-pulse" /> : <HelpCircle size={12} className="text-indigo-500" />}
              {activeBadge.label}
            </span>
            
            {/* Waveform animado para Gravação de Voz */}
            {isRecording && (
              <div className="flex items-center gap-1">
                {[0.1, 0.4, 0.25, 0.6, 0.15, 0.35].map((d, i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 bg-emerald-500 rounded-full"
                    animate={{ height: ["4px", "12px", "4px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                    style={{ height: "4px" }}
                  />
                ))}
              </div>
            )}
          </div>

          <textarea
            value={currentTranscription}
            onChange={(e) => setCurrentTranscription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm leading-relaxed resize-none h-16 focus:ring-0 p-0 font-medium placeholder-slate-400"
            placeholder={isRecording ? "Fale pausadamente, sua voz está sendo transcrita..." : "Formule sua resposta utilizando detalhes e contexto técnico..."}
            disabled={isEvaluating}
          />
        </div>

        {/* BOTÕES DE CONTROLE INFERIORES */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={toggleRecording}
            disabled={isEvaluating}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
              isRecording 
                ? "bg-red-500 border-red-600 text-white" 
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
            }`}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            disabled={isEvaluating || !currentTranscription.trim()}
            onClick={handleSend}
            className="flex-grow h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            {isEvaluating ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analisando resposta...</span>
            ) : (
              <><span>Enviar Resposta</span><Send size={14} /></>
            )}
          </button>
        </div>

        {/* LINKS SECUNDÁRIOS */}
        <div className="flex justify-between items-center px-1 text-xs">
          <button onClick={onSkipQuestion} disabled={isEvaluating} className="text-slate-400 hover:text-indigo-500 font-bold flex items-center gap-1 cursor-pointer">
            <SkipForward size={14} /> Pular pergunta
          </button>
          <button onClick={() => onSetConfirmExitOpen(true)} className="text-rose-500 hover:underline font-bold flex items-center gap-1 cursor-pointer">
            Encerrar e Ver Parecer Técnico
          </button>
        </div>
      </footer>

      {/* MODAL DE CONFIRMAÇÃO DE SAÍDA */}
      <AnimatePresence>
        {isConfirmExitOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4 text-slate-800 dark:text-slate-200">
              <h3 className="text-lg font-bold">Finalizar Simulação Agora?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">A Dra. Ana Martins usará as respostas coletadas até o momento para estruturar seu relatório de soft skills e hard skills.</p>
              
              {currentTranscription.trim().length > 0 && (
                <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl text-xs font-semibold">
                  💡 O texto que você já começou a digitar também será computado no seu relatório!
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={() => onSetConfirmExitOpen(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Voltar</button>
                <button onClick={() => { onSetConfirmExitOpen(false); onEndInterview(currentTranscription); }} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer">Consolidar & Sair</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TELA DE COMPILAÇÃO COM LOBBY ANIMADO */}
      <AnimatePresence>
        {isCompilingReport && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="max-w-sm w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                <img src="/src/assets/images/dra_ana_avatar_1781485052071.jpg" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 relative z-10" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-md font-bold text-white tracking-wide uppercase">Processando Parecer Técnico</h3>
                <p className="text-xs text-indigo-400 font-semibold">Dra. Ana Martins Martins</p>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 14 }} className="bg-indigo-500 h-full rounded-full" />
              </div>

              <div className="h-8 flex items-center justify-center text-xs font-medium text-slate-400">
                <motion.p key={compilingPhase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {phases[compilingPhase]}
                </motion.p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
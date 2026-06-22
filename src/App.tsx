import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import Header from "./components/Header";
import SetupPage from "./components/SetupPage";
import InterviewPage from "./components/InterviewPage";
import ResultsPage from "./components/ResultsPage";
import HistoryPage from "./components/HistoryPage";
import BottomNavBar from "./components/BottomNavBar";
import AuthPage from "./components/AuthPage";
import PermissionsPage, { SystemAccessConfig } from "./components/PermissionsPage";
import HomePage from "./components/HomePage";
import AboutPage from "./components/AboutPage";
import RecruiterPage from "./components/RecruiterPage";
import RejectionScreen from "./components/RejectionScreen";
import { InterviewConfig, Message, InterviewSession, InterviewEvaluation } from "./types";
import { initInterview, evaluateInterview, analyzeGuestCv, getNextTurnResponse } from "./services/api";
import RateLimitNotification from "./components/RateLimitNotification";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] } }
};

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme_v1") as "light" | "dark") || "light"
  );

  useEffect(() => {
    localStorage.setItem("theme_v1", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("auth_user_v1");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token_v1") || null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    const storedToken = localStorage.getItem("auth_token_v1");
    if (storedToken) return false;
    const storedGuest = localStorage.getItem("auth_guest_v1");
    return storedGuest === "false" ? false : true;
  });

  const [currentTab, setCurrentTab] = useState<string>("home");
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isCompilingReport, setIsCompilingReport] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isZen, setIsZen] = useState<boolean>(false);

  // Administrative access rules configuration state
  const [accessConfig, setAccessConfig] = useState<SystemAccessConfig>(() => {
    try {
      const stored = localStorage.getItem("system_access_config_v1");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      allowGuestCv: true,
      allowGuestChat: false,
      allowGuestTts: true,
      allowGuestAudioRecording: false,
      requireAuthForExport: false,
      maxGuestSessions: 2,
    };
  });

  useEffect(() => {
    localStorage.setItem("system_access_config_v1", JSON.stringify(accessConfig));
  }, [accessConfig]);

  // Rate limits state (load from localStorage, clear expired)
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(() => {
    const value = localStorage.getItem("gemini_rate_limit_until_v1");
    if (value) {
      const ts = parseInt(value, 10);
      if (ts > Date.now()) {
        return ts;
      } else {
        localStorage.removeItem("gemini_rate_limit_until_v1");
      }
    }
    return null;
  });

  const [isQuotaErrorSimulated, setIsQuotaErrorSimulated] = useState<boolean>(false);
  const [coherenceError, setCoherenceError] = useState<string | null>(null);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState<boolean>(false);

  useEffect(() => {
    if (rateLimitUntil !== null) {
      localStorage.setItem("gemini_rate_limit_until_v1", rateLimitUntil.toString());
      const interval = setInterval(() => {
        if (Date.now() >= rateLimitUntil) {
          setRateLimitUntil(null);
          localStorage.removeItem("gemini_rate_limit_until_v1");
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      localStorage.removeItem("gemini_rate_limit_until_v1");
    }
  }, [rateLimitUntil]);

  // Voltar para o topo todas as vezes que a tela mudar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentTab]);
  
  // Evaluation result state
  const [result, setResult] = useState<InterviewEvaluation | null>(null);
  const [isBasicCvAnalysis, setIsBasicCvAnalysis] = useState<boolean>(false);
  const [fallbackModelType, setFallbackModelType] = useState<"lite" | "offline" | null>(null);

  // Global Interview History
  const [sessions, setSessions] = useState<InterviewSession[]>([]);

  // Synchronize history based on token or guest mode
  useEffect(() => {
    if (token) {
      const fetchServerSessions = async () => {
        try {
          const res = await fetch("/api/sessions", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.sessions) {
              setSessions(data.sessions);
            }
          } else if (res.status === 401) {
            // Expired token
            handleLogout();
          }
        } catch (err) {
          console.error("Erro ao sincronizar histórico com o servidor:", err);
        }
      };
      fetchServerSessions();
    } else if (isGuest) {
      try {
        const stored = localStorage.getItem("interview_sessions_v1");
        setSessions(stored ? JSON.parse(stored) : []);
      } catch {
        setSessions([]);
      }
    }
  }, [token, isGuest]);

  // Keep LocalStorage in sync for guests
  useEffect(() => {
    if (isGuest && !token) {
      localStorage.setItem("interview_sessions_v1", JSON.stringify(sessions));
    }
  }, [sessions, isGuest, token]);

  const handleAuthSuccess = (newToken: string, authUser: AuthUser) => {
    localStorage.setItem("auth_token_v1", newToken);
    localStorage.setItem("auth_user_v1", JSON.stringify(authUser));
    localStorage.removeItem("auth_guest_v1");
    setToken(newToken);
    setUser(authUser);
    setIsGuest(false);
    setCurrentTab("home");
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem("auth_guest_v1", "true");
    setIsGuest(true);
    setToken(null);
    setUser(null);
    setCurrentTab("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token_v1");
    localStorage.removeItem("auth_user_v1");
    localStorage.removeItem("auth_guest_v1");
    setToken(null);
    setUser(null);
    setIsGuest(false);
    setSessions([]);
    setQuestions([]);
    setChatHistory([]);
    setResult(null);
    setConfig(null);
  };

  const handleTabChange = (tab: string) => {
    setIsZen(false);
    const userRole = user?.role || "candidato";
    const isRecruiter = userRole === "recrutador";

    if (isRecruiter && (tab === "setup" || tab === "interview" || tab === "history" || tab === "result")) {
      return;
    }

    if (!isRecruiter && tab === "recruiter") {
      return;
    }

    if (isGuest && (tab === "history" || tab === "permissions")) {
      alert("Essa é uma aba de funcionalidade avançada que requer autenticação segura. Por favor, registre-se ou faça login com sua conta para acessar esse recurso! 🔒");
      handleLogout();
      return;
    }

    if (tab === "setup" && currentTab === "interview") {
      const confirmMsg = config?.language === "Inglês"
        ? "Do you really want to leave the active interview? Unsaved progress will be lost."
        : "Você quer mesmo sair do bate-papo ativo da entrevista? O progresso não salvo será descartado.";
      if (confirm(confirmMsg)) {
        setQuestions([]);
        setChatHistory([]);
        setCurrentTab("setup");
      }
    } else {
      setCurrentTab(tab);
    }
  };

  // Handle Init Interview Simulation
  const handleStartInterview = async (interviewConfig: InterviewConfig) => {
    if (rateLimitUntil !== null) {
      alert("A simulação está indisponível devido ao limite de requisições do Gemini atingido. Aguarde a liberação automática.");
      return;
    }

    setCoherenceError(null);
    const finalConfig = { ...interviewConfig, simulateRateLimit: isQuotaErrorSimulated };

    try {
      setIsEvaluating(true);

      if (finalConfig.onlyCvAnalysis) {
        const { evaluation: basicEvaluation, actualModelUsed } = await analyzeGuestCv(finalConfig);
        if (actualModelUsed === "gemini-3.1-flash-lite") {
          setFallbackModelType("lite");
        } else if (actualModelUsed === "offline") {
          setFallbackModelType("offline");
        } else {
          setFallbackModelType(null);
        }
        setResult(basicEvaluation);
        setIsBasicCvAnalysis(true);

        if (token) {
          const newSessionId = Date.now().toString();
          const newSession: InterviewSession = {
            id: newSessionId,
            date: new Date().toISOString(),
            config: finalConfig,
            questions: [],
            answers: [],
            chatHistory: [],
            evaluation: basicEvaluation,
          };
          setSessions((prev) => [newSession, ...prev]);

          fetch("/api/sessions/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ session: newSession }),
          })
          .then((res) => {
            if (!res.ok) console.warn("Lentidão no arquivo JSON do servidor ao gravar.");
          })
          .catch((err) => {
            console.error("Erro silencioso ao persistir sessão no JSON:", err);
          });
        }

        setIsEvaluating(false);
        setResult(basicEvaluation);
        setIsBasicCvAnalysis(true);
        setCurrentTab("result");
        
        return;
      }

      if (isGuest && !token) {
        if (!accessConfig.allowGuestCv) {
          alert("O acesso para Convidados está bloqueado de acordo com as regras de segurança atuais. Por favor, registre-se ou faça login com uma conta real!");
          handleLogout();
          return;
        }

        if (accessConfig.allowGuestChat) {
          // Administrator allowed complete live interview simulation even for guests!
          setIsBasicCvAnalysis(false);
        } else {
          // Hard cap on guest session counts to ensure API safety
          if (sessions.length >= accessConfig.maxGuestSessions) {
            alert(`Você atingiu o limite máximo gratuito de ${accessConfig.maxGuestSessions} simulações como Convidado. Por favor, crie uma conta ou faça login para ter acesso ilimitado com a Dra. Ana! 🔒`);
            handleLogout();
            return;
          }

          // Guest users get basic CV feedback analysis directly rather than starting interview conversation
          const { evaluation: basicEvaluation, actualModelUsed } = await analyzeGuestCv(finalConfig);
          if (actualModelUsed === "gemini-3.1-flash-lite") {
            setFallbackModelType("lite");
          } else if (actualModelUsed === "offline") {
            setFallbackModelType("offline");
          } else {
            setFallbackModelType(null);
          }
          setResult(basicEvaluation);
          setIsBasicCvAnalysis(true);
          setCurrentTab("result");
          return;
        }
      } else {
        setIsBasicCvAnalysis(false);
      }

      const { questions: generatedQuestions, actualModelUsed } = await initInterview(finalConfig);
      if (actualModelUsed === "gemini-3.1-flash-lite") {
        setFallbackModelType("lite");
      } else if (actualModelUsed === "offline") {
        setFallbackModelType("offline");
      } else {
        setFallbackModelType(null);
      }
      
      const newSessionId = Date.now().toString();
      setActiveSessionId(newSessionId);
      setConfig(finalConfig);
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);

      // Welcome prompt by Dr. Ana
      const firstQuestion = generatedQuestions[0] || "Por favor, para começarmos, me fale um pouco de você e seus objetivos de carreira.";
      const initialMsg: Message = {
        id: "init-msg",
        role: "interviewer",
        text: firstQuestion,
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatHistory([initialMsg]);
      setResult(null);
      setCurrentTab("interview");
    } catch (error: any) {
      if (error.isRateLimited) {
        setRateLimitUntil(Date.now() + (error.retryAfter || 14400) * 1000);
        return;
      }
      const errMsg = error.message || "";
      // If it looks like a coherence refusal message from Dra. Ana, display inline
      if (errMsg.includes("Dra. Ana") || errMsg.includes("coerência") || errMsg.includes("currículo") || errMsg.includes("vaga") || errMsg.includes("desconexão") || errMsg.includes("Incoerência") || errMsg.includes("incompatibilidade")) {
        setCoherenceError(errMsg);
        setConfig(finalConfig);
        setCurrentTab("rejection");
      } else {
        alert(errMsg || "Não foi possível iniciar a simulação. Verifique sua chave API Gemini.");
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit Answer & Handle Conversation Flow
  const handleAnswerSubmit = async (answerText: string) => {
    if (rateLimitUntil !== null) {
      alert("Ação suspensa devido ao limite de requisições excedido.");
      return;
    }
    if (!questions.length || !config) return;

    // Add candidate message
    const userMsg: Message = {
      id: `cand-${Date.now()}`,
      role: "candidate",
      text: answerText,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);

    try {
      setIsEvaluating(true);
      
      // Fetch dynamic Turn Response from Dra. Ana (comment, clarification and next turn logic flows)
      const turnResult = await getNextTurnResponse(config, updatedHistory, questions, currentQuestionIndex);
      if (turnResult.actualModelUsed === "gemini-3.1-flash-lite") {
        setFallbackModelType("lite");
      } else if (turnResult.actualModelUsed === "offline") {
        setFallbackModelType("offline");
      } else {
        setFallbackModelType(null);
      }
      
      const botMsg: Message = {
        id: `int-${Date.now()}`,
        role: "interviewer",
        text: turnResult.text,
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatHistory((prev) => [...prev, botMsg]);

      if (turnResult.endOfInterview) {
        // Automatically compile the evaluation diagnoses on last questions answered
        await handleCompleteInterview([...updatedHistory, botMsg]);
      } else if (!turnResult.clarificationRequired) {
        // Increment question pointer only if NO clarification is requested
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= questions.length) {
          // No more questions! Automatically finish and navigate to the result diagnosis tab.
          await handleCompleteInterview([...updatedHistory, botMsg]);
        } else {
          setCurrentQuestionIndex(nextIndex);
        }
      }
    } catch (error: any) {
      if (error.isRateLimited) {
        setRateLimitUntil(Date.now() + (error.retryAfter || 14400) * 1000);
        return;
      }
      console.error("Erro no fluxo de diálogo interativo:", error);
      // Fast progressive fallback
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        const nextQuestion = questions[nextIndex];
        const botMsg: Message = {
          id: `int-${Date.now()}`,
          role: "interviewer",
          text: nextQuestion,
          timestamp: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setChatHistory((prev) => [...prev, botMsg]);
        setCurrentQuestionIndex(nextIndex);
      } else {
        await handleCompleteInterview(updatedHistory);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle ending interview early or regularly
  const handleCompleteInterview = async (finalHistory: Message[]) => {
    if (rateLimitUntil !== null) {
      alert("Ação suspensa devido ao limite de requisições excedido.");
      return;
    }
    if (!config) return;
    try {
      setIsEvaluating(true);
      setIsCompilingReport(true);
      setCurrentTab("interview"); // Stay on screen showing loading state
      const { evaluation, actualModelUsed } = await evaluateInterview(config, finalHistory);
      if (actualModelUsed === "gemini-3.1-flash-lite") {
        setFallbackModelType("lite");
      } else if (actualModelUsed === "offline") {
        setFallbackModelType("offline");
      } else {
        setFallbackModelType(null);
      }
      
      const newSession: InterviewSession = {
        id: activeSessionId || Date.now().toString(),
        date: new Date().toISOString(),
        config,
        questions,
        answers: finalHistory
          .filter((m) => m.role === "candidate")
          .map((m) => m.text),
        chatHistory: finalHistory,
        evaluation,
      };

      setResult(evaluation);
      setSessions((prev) => [newSession, ...prev]);
      setChatHistory(finalHistory);

      // Sync to Server if user is logged in
      if (token) {
        try {
          await fetch("/api/sessions/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ session: newSession })
          });
        } catch (err) {
          console.error("Erro de sincronização de resultado de simulação:", err);
        }
      }

      setCurrentTab("result");
    } catch (error: any) {
      if (error.isRateLimited) {
        setRateLimitUntil(Date.now() + (error.retryAfter || 14400) * 1000);
        return;
      }
      alert( "Erro ao analisar respostas. Favor tentar novamente.");
    } finally {
      setIsEvaluating(false);
      setIsCompilingReport(false);
    }
  };

  // Skip step
  const handleSkipQuestion = () => {
    const skippedText = config?.language === "Inglês" 
      ? "[The candidate decided to skip this question]" 
      : "[O candidato pulou esta pergunta]";
      
    handleAnswerSubmit(skippedText);
  };

  const handleSelectHistoricalSession = (session: InterviewSession) => {
    setConfig(session.config);
    setQuestions(session.questions);
    setChatHistory(session.chatHistory);
    setResult(session.evaluation || null);
    setIsBasicCvAnalysis(false);
    setCurrentTab("result");
  };

  const handleClearHistory = async () => {
    if (confirm("Deseja realmente limpar todo o histórico de simulações?")) {
      setSessions([]);
      if (token) {
        try {
          await fetch("/api/sessions/clear", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
          });
        } catch (err) {
          console.error("Falha ao redefinir histórico no servidor:", err);
        }
      }
    }
  };

  if (!token && !isGuest) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-[#F1F5F9] text-[#0F172A] dark:bg-[#0B0F19] dark:text-slate-100 flex flex-col transition-colors duration-300 ${
      isZen && currentTab === "interview" ? "" : "pb-20 md:pb-0"
    }`}>
      {!(isZen && currentTab === "interview") && (
        <Header
          currentTab={currentTab}
          onTabChange={handleTabChange}
          showExitButton={currentTab === "interview" && !isCompilingReport && !isEvaluating}
          onExitClick={() => {
            if (isEvaluating || isCompilingReport) return;
            setIsConfirmExitOpen(true);
          }}
          user={user}
          isGuest={isGuest}
          onLogout={handleLogout}
          theme={theme}
          onThemeToggle={toggleTheme}
        />
      )}

      <main className={`flex-1 w-full h-full overflow-y-auto ${
        isZen && currentTab === "interview" ? "pt-0" : "pt-16"
      }`}>
        {!(isZen && currentTab === "interview") && (
          <RateLimitNotification
            rateLimitUntil={rateLimitUntil}
            onClearLimit={() => {
              setRateLimitUntil(null);
              setIsQuotaErrorSimulated(false);
            }}
            onSimulateLimit={(hours) => {
              setIsQuotaErrorSimulated(true);
              setRateLimitUntil(Date.now() + hours * 60 * 60 * 1000);
            }}
            showSimulation={false}
          />
        )}
        
        <AnimatePresence mode="wait">
          {currentTab === "home" && (
            <motion.div
              key="home"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <HomePage
                onNavigate={(tab) => setCurrentTab(tab)}
                isGuest={isGuest}
                username={user?.name}
                userRole={user?.role || "candidato"}
              />
            </motion.div>
          )}

          {currentTab === "about" && (
            <motion.div
              key="about"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <AboutPage
                onBackToHome={() => setCurrentTab("home")}
              />
            </motion.div>
          )}

          {currentTab === "recruiter" && (
            <motion.div
              key="recruiter"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <RecruiterPage
                isGuest={isGuest}
              />
            </motion.div>
          )}

          {currentTab === "setup" && (
            <motion.div
              key="setup"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <SetupPage
                onStartInterview={handleStartInterview}
                isLoading={isEvaluating}
                isGuest={isGuest}
                onRateLimitTriggered={() => {
                  setRateLimitUntil(Date.now() + 14400 * 1000); // 4 hours in ms
                }}
                coherenceError={coherenceError}
                onClearCoherenceError={() => setCoherenceError(null)}
                fallbackModelType={fallbackModelType}
                onClearFallbackModelType={() => setFallbackModelType(null)}
              />
            </motion.div>
          )}

          {currentTab === "rejection" && (
            <motion.div
              key="rejection"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <RejectionScreen
                coherenceError={coherenceError || "Incoerência de perfil detectada de forma indefinida."}
                config={config}
                onBackToSetup={() => {
                  setCoherenceError(null);
                  setCurrentTab("setup");
                }}
                onResetToDefault={() => {
                  setCoherenceError(null);
                  setCurrentTab("setup");
                }}
              />
            </motion.div>
          )}

          {currentTab === "interview" && config && (
            <motion.div
              key="interview"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <InterviewPage
                config={config}
                questions={questions}
                chatHistory={chatHistory}
                currentQuestionIndex={currentQuestionIndex}
                onAnswerSubmit={handleAnswerSubmit}
                onSkipQuestion={handleSkipQuestion}
                onEndInterview={(pendingText?: string) => {
                  if (isEvaluating || isCompilingReport) return;
                  if (pendingText && pendingText.trim()) {
                    const userMsg: Message = {
                      id: `cand-${Date.now()}`,
                      role: "candidate",
                      text: pendingText.trim(),
                      timestamp: new Date().toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    };
                    handleCompleteInterview([...chatHistory, userMsg]);
                  } else {
                    handleCompleteInterview(chatHistory);
                  }
                }}
                isConfirmExitOpen={isConfirmExitOpen}
                onSetConfirmExitOpen={setIsConfirmExitOpen}
                isEvaluating={isEvaluating}
                isCompilingReport={isCompilingReport}
                isZen={isZen}
                onToggleZen={() => setIsZen(!isZen)}
              />
            </motion.div>
          )}

          {currentTab === "result" && result && (
            <motion.div
              key="result"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <ResultsPage
                evaluation={result}
                isBasicCvAnalysis={isBasicCvAnalysis}
                isGuest={isGuest}
                accessConfig={accessConfig}
                onRestart={() => {
                  setIsBasicCvAnalysis(false);
                  setCurrentTab("setup");
                }}
                onAuthUnlock={handleLogout}
              />
            </motion.div>
          )}

          {currentTab === "history" && (
            <motion.div
              key="history"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <HistoryPage
                sessions={sessions}
                onSelectSession={handleSelectHistoricalSession}
                onClearHistory={handleClearHistory}
                onStartNew={() => setCurrentTab("setup")}
              />
            </motion.div>
          )}

          {currentTab === "permissions" && (
            <motion.div
              key="permissions"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants as any}
              className="w-full"
            >
              <PermissionsPage
                accessConfig={accessConfig}
                onUpdateConfig={setAccessConfig}
                currentUserRole={isGuest ? "guest" : "member"}
                currentUserEmail={user?.email}
                onNavigateToAuth={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom bar navigation for mobile devices */}
      {!(isZen && currentTab === "interview") && (
        <BottomNavBar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          isInterviewActive={currentTab === "interview" || (questions.length > 0 && currentTab !== "result")}
          userRole={user?.role || "candidato"}
        />
      )}
    </div>
  );
}

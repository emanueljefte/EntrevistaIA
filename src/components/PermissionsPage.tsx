import React, { useState } from "react";
import {
  Shield,
  Lock,
  Unlock,
  Key,
  Users,
  User,
  Fingerprint,
  FileText,
  Volume2,
  AlertTriangle,
  HelpCircle,
  Database,
  Check,
  RefreshCw,
} from "lucide-react";

export interface SystemAccessConfig {
  allowGuestCv: boolean;
  allowGuestChat: boolean;
  allowGuestTts: boolean;
  allowGuestAudioRecording: boolean;
  requireAuthForExport: boolean;
  maxGuestSessions: number;
}

interface PermissionsPageProps {
  accessConfig: SystemAccessConfig;
  onUpdateConfig: (newConfig: SystemAccessConfig) => void;
  currentUserRole: "guest" | "member";
  currentUserEmail?: string;
  onNavigateToAuth: () => void;
}

export default function PermissionsPage({
  accessConfig,
  onUpdateConfig,
  currentUserRole,
  currentUserEmail,
  onNavigateToAuth,
}: PermissionsPageProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleRule = (key: keyof Omit<SystemAccessConfig, "maxGuestSessions">) => {
    const updated = {
      ...accessConfig,
      [key]: !accessConfig[key],
    };
    onUpdateConfig(updated);
    showNotice("Regra de acesso atualizada com sucesso!");
  };

  const setLimit = (val: number) => {
    const updated = {
      ...accessConfig,
      maxGuestSessions: val,
    };
    onUpdateConfig(updated);
    showNotice(`Limite de simulações definido para ${val}.`);
  };

  const showNotice = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

  const resetToDefaults = () => {
    const defaults: SystemAccessConfig = {
      allowGuestCv: true,
      allowGuestChat: false,
      allowGuestTts: true,
      allowGuestAudioRecording: false,
      requireAuthForExport: false,
      maxGuestSessions: 2,
    };
    onUpdateConfig(defaults);
    showNotice("Políticas de segurança reinicializadas para os padrões de produção!");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 animate-fade-in pb-24 text-slate-700 dark:text-slate-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1.5">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Segurança & Políticas de Ingressos</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Gestão de Acesso & Autenticação
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Controle interativamente quais áreas da IA necessitam de registro e configure as regras de convidados.
          </p>
        </div>

        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 self-start md:self-center px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/25 border border-slate-200 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restaurar Padrões de Produção</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mb-6 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-350 rounded-xl flex items-center gap-2 text-xs font-medium animate-slide-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Rules vs Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns - Policy Toggles and Limits */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Rules Section: Guest Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors duration-300">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/85 mb-5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-405 animate-pulse">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">Liberdades de Convidados (Guest Mode)</h2>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">O que é permitido sem conta</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {/* Row 1: Allow Guest CV Analyze */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-250 block">Análise de Currículo em PDF/Texto</span>
                    <span className="text-xs text-slate-400 dark:text-slate-450 font-medium leading-relaxed">
                      Permite que visitantes sem login enviem dados ou texto de currículo para receber feedbacks e notas na tela de resultados.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule("allowGuestCv")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    accessConfig.allowGuestCv ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      accessConfig.allowGuestCv ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Row 2: Allow Guest Interactive Chat */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/60">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-250 block">Simular Entrevista Completa com Chat</span>
                    <span className="text-xs text-slate-400 dark:text-slate-455 font-medium leading-relaxed">
                      Libera o bate-papo de perguntas e respostas interativas com a Dra. Ana para usuários sem login. Recomenda-se desativado em produção para evitar abusos na API Gemini.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule("allowGuestChat")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    accessConfig.allowGuestChat ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      accessConfig.allowGuestChat ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Row 3: Allow Guest Audio Recording */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/60">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-250 block">Resposta Assistida de Viva Voz (Gravar Áudio)</span>
                    <span className="text-xs text-slate-400 dark:text-slate-455 font-medium leading-relaxed">
                      Permite que candidatos usem o microfone do navegador para gravar respostas de voz nas entrevistas sem login.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule("allowGuestAudioRecording")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    accessConfig.allowGuestAudioRecording ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      accessConfig.allowGuestAudioRecording ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Row 4: Audio Book/TTS Synthesis for Guests */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/60">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-slate-500 dark:text-indigo-400 shrink-0">
                    <Volume2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-250 block">Síntese de Voz (Leitura em Áudio) do Relatório</span>
                    <span className="text-xs text-slate-400 dark:text-slate-455 font-medium leading-relaxed">
                      Habilita o reprodutor de áudio / escuta eletrônica do relatório técnico na tela de resultados de currículo ou simulação para convidados.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule("allowGuestTts")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    accessConfig.allowGuestTts ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      accessConfig.allowGuestTts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Limits section: When is authentication strictly required */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors duration-300">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">Configurações de Bloqueio & Cotas</h2>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Quando a autenticação deve ser exigida</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Row 1: Max sessions slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-250 block">Capacidade Gratuita de Sessões</span>
                    <span className="text-xs text-slate-400 dark:text-slate-450 font-medium">Quantas análises ou simulações o convidado pode rodar antes de ser bloqueado e forçado a autenticar.</span>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 text-center min-w-[50px]">
                    {accessConfig.maxGuestSessions} sim.
                  </span>
                </div>
                
                <div className="flex gap-2.5 mt-3">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLimit(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        accessConfig.maxGuestSessions === num
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 border-slate-200/60 dark:border-slate-800"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Require Auth for Export button */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-250 block">Forçar Login para Exportar Feedbacks</span>
                    <span className="text-xs text-slate-400 dark:text-slate-455 font-medium leading-relaxed">
                      Bloqueia a barra de compartilhamento e cópia do diagnóstico técnico na tela de resultados, exigindo o cadastro completo.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule("requireAuthForExport")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    accessConfig.requireAuthForExport ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      accessConfig.requireAuthForExport ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sandbox Current User Simulator */}
        <div className="flex flex-col gap-6">
          {/* Information Map Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
              <h2 className="font-display font-bold text-base text-slate-200">Seu Perfil Atual</h2>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Modo Atual:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    currentUserRole === "member"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {currentUserRole === "guest" ? "Convidado ⚡" : "Membro Autenticado"}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Nome / Identidade:</span>
                <span className="font-bold text-slate-200 truncate max-w-[140px]">
                  {currentUserRole === "member" ? currentUserEmail : "Visitante Anônimo"}
                </span>
              </div>

              {currentUserRole === "guest" && (
                <button
                  type="button"
                  onClick={onNavigateToAuth}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-[0.98] transition-all py-2 rounded-xl text-xs font-bold font-sans cursor-pointer uppercase text-center flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Configurar Conta 🔑</span>
                </button>
              )}
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Seu Diagnóstico de Acesso:
            </h3>

            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Análise Curricular
                </span>
                {currentUserRole === "member" || accessConfig.allowGuestCv ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3.5 h-3.5" /> Liberado
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-3.5 h-3.5" /> Bloqueado
                  </span>
                )}
              </li>

              <li className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Simulador de Chat
                </span>
                {currentUserRole === "member" || accessConfig.allowGuestChat ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3.5 h-3.5" /> Liberado
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-3.5 h-3.5" /> Bloqueado
                  </span>
                )}
              </li>

              <li className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Leitura de Áudio TTS
                </span>
                {currentUserRole === "member" || accessConfig.allowGuestTts ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3.5 h-3.5" /> Liberado
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-3.5 h-3.5" /> Bloqueado
                  </span>
                )}
              </li>

              <li className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Microfone de Voz
                </span>
                {currentUserRole === "member" || accessConfig.allowGuestAudioRecording ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3.5 h-3.5" /> Liberado
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-3.5 h-3.5" /> Bloqueado
                  </span>
                )}
              </li>
            </ul>
          </div>

          {/* Quick Guide explaining policy logic */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/60 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>Como Funciona o Controle?</span>
            </div>
            <p className="text-xs text-indigo-950 dark:text-slate-355 font-medium leading-relaxed">
              As políticas de permissão do EntrevistaIA garantem a proteção contra chamadas caras à API do Gemini e
              gerenciam quando as rotas do back-end (`/api/*`) devem rejeitar requisições de tokens anônimos.
            </p>
            <div className="mt-4 p-2.5 bg-indigo-100/40 dark:bg-indigo-950/40 rounded-xl flex gap-2 items-start text-[10px] text-indigo-800 dark:text-indigo-400 font-semibold leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Dica técnica: Quando o botão "Simular Entrevista Completa" é restringido, convidados que tentam burlar pela interface recebem avisos imediatos de barreira autenticada.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

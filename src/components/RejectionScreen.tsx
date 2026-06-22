import React from "react";
import { 
  AlertTriangle, 
  ArrowLeft, 
  FileText, 
  Briefcase, 
  RefreshCw, 
  HelpCircle, 
  Lightbulb, 
  ShieldAlert,
  ArrowRightLeft,
  Settings,
  UserCheck
} from "lucide-react";
import { InterviewConfig } from "../types";

interface RejectionScreenProps {
  coherenceError: string;
  config: InterviewConfig | null;
  onBackToSetup: () => void;
  onResetToDefault: () => void;
}

export default function RejectionScreen({
  coherenceError,
  config,
  onBackToSetup,
  onResetToDefault
}: RejectionScreenProps) {
  // Try to clean/extract some parts from coherenceError if structured,
  // or just present it with high elegance.
  const fieldName = config?.field || "Vaga Alvo";
  const seniorityStr = config?.experienceLevel || "Sênior";
  const hasFileName = !!config?.cvFileName;
  const fileName = config?.cvFileName || "Curriculum_Vitae.pdf";

  return (
    <div id="rejection-container" className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0 ring-4 ring-rose-500/10">
            <ShieldAlert size={36} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                Triagem Rejeitada
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Parecer de Coerência</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              Painel de Devolução Técnico-Comportamental
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Dra. Ana Martins — Recrutamento Técnico e Científico de Elite
            </p>
          </div>
        </div>

        <button
          onClick={onBackToSetup}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          <ArrowLeft size={14} />
          Voltar ao Ajuste de Vaga
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Comparison Details Column */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Main Error Box */}
          <div className="bg-gradient-to-br from-rose-50/40 to-rose-50/10 dark:from-rose-950/10 dark:to-transparent border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 text-rose-500/5 select-none pointer-events-none">
              <AlertTriangle size={200} />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                Exposição do Diagnóstico de Triagem
              </span>
              <div className="flex-1 h-[1px] bg-rose-100 dark:bg-rose-900/20" />
            </div>

            <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm leading-relaxed whitespace-pre-wrap">
              {coherenceError}
            </p>

            <div className="mt-5 pt-4 border-t border-rose-100/60 dark:border-rose-900/20 flex gap-2.5 items-start">
              <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                Este sistema utiliza uma <span className="text-rose-600 dark:text-rose-400 font-bold underline">Métrica de Validação Semântica</span> para assegurar que apenas perfis que guardam conexão mínima real iniciem o simulador interativo, evitando o desperdício de chamadas e mantendo o realismo da IA.
              </div>
            </div>
          </div>

          {/* Comparative visual layout */}
          <div className="card-surface rounded-3xl p-6 border border-slate-100 dark:border-slate-850 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-indigo-500" />
              Mapeamento de Divergência Profissional
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target vacancy requirements */}
              <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 flex flex-col gap-2">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                  <Briefcase size={12} /> Exigências da Vaga Desejada
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cargo: <span className="text-indigo-600 dark:text-indigo-400 font-black">{fieldName}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Maturidade: <span className="text-slate-900 dark:text-slate-100">{seniorityStr}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 font-semibold border-t border-indigo-100/30 dark:border-indigo-900/10 pt-2 leading-relaxed">
                  {config?.jobRequirements || "Por favor, cadastre requisitos válidos para a vaga."}
                </div>
              </div>

              {/* Uploaded CV info */}
              <div className="p-4 rounded-2xl bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/10 flex flex-col gap-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                  <FileText size={12} /> currículo analisado
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    Documento: <span className="text-slate-900 dark:text-slate-100 font-extrabold">{fileName}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Canal: <span className="text-slate-500 dark:text-slate-400 font-medium">{hasFileName ? "Documento PDF" : "Texto colado manualmente"}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold border-t border-rose-100/20 dark:border-rose-900/10 pt-2 leading-relaxed">
                  O documento examinado pela Dra. Ana Martins aponta para competências e frentes de atuação com semântica desalinhada da área de {fieldName}.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls Panel */}
        <div className="flex flex-col gap-6">
          <div className="card-surface rounded-3xl p-6 border border-slate-100 dark:border-slate-850 flex flex-col gap-5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
              <Settings size={14} className="text-indigo-500" />
              Ações Corretivas
            </h3>

            <div className="flex flex-col gap-3">
              <button
                onClick={onBackToSetup}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Settings size={14} />
                Ajustar Vaga ou Currículo
              </button>

              <button
                onClick={onResetToDefault}
                className="w-full py-3 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-905 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <RefreshCw size={14} />
                Restaurar Vaga Padrão ✨
              </button>
            </div>

            <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle size={12} /> Como resolver?
              </span>
              <ul className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold space-y-1.5 pr-1 list-disc pl-3">
                <li>Verifique se o arquivo de currículo inserido é o correto.</li>
                <li>Caso use requisitos customizados, revise se não exigiu competências de outro segmento.</li>
                <li>Selecione um Cargo ou nível que possua afinidade técnica ou use os <b>Perfis de Exemplo</b> na tela inicial!</li>
              </ul>
            </div>
          </div>

          {/* Proactive Help card */}
          <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/20 rounded-3xl flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
              <UserCheck size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-400">
                Simulações Gratuitas
              </h4>
              <p className="text-[10px] text-slate-650 dark:text-slate-350 leading-relaxed font-semibold mt-1">
                Lembre-se: no modo Convidado você pode carregar seu currículo e experimentar de forma ágil as avaliações sem limite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

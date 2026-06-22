import React from "react";
import { InterviewSession } from "../types";

interface HistoryPageProps {
  sessions: InterviewSession[];
  onSelectSession: (session: InterviewSession) => void;
  onClearHistory: () => void;
  onStartNew: () => void;
}

export default function HistoryPage({
  sessions,
  onSelectSession,
  onClearHistory,
  onStartNew,
}: HistoryPageProps) {
  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6 text-slate-705 dark:text-slate-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">Histórico de Simulações</h1>
          <p className="font-medium text-slate-500 dark:text-slate-400 text-sm">
            Reveja os resultados e diagnósticos de suas entrevistas anteriores.
          </p>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-rose-500 hover:text-rose-600 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Limpar tudo
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card-surface rounded-3xl p-12 text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-500">history_toggle_off</span>
          <div>
            <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">Nenhuma entrevista realizada</h3>
            <p className="font-body-sm text-slate-505 dark:text-slate-400 max-w-md mx-auto">
              Inicie sua primeira simulação de entrevista técnica para receber feedback do recrutador de inteligência artificial.
            </p>
          </div>
          <button
            onClick={onStartNew}
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 transition-colors px-6 py-2.5 rounded-xl text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/10"
          >
            Configurar Nova Entrevista
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => {
            const dateStr = new Date(session.date).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                className="card-surface hover:border-indigo-500 hover:shadow-md transition-all rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer group"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                      {session.config.field}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{dateStr}</span>
                  </div>
                  <h3 className="text-lg text-slate-800 dark:text-slate-200 font-bold group-hover:text-indigo-600 transition-colors">
                    Entrevista para {session.config.experienceLevel}
                  </h3>
                  <p className="text-sm text-slate-550 dark:text-slate-400 line-clamp-1 max-w-md font-medium">
                    Idioma: {session.config.language} • {session.questions.length} perguntas atendidas
                  </p>
                </div>

                {session.evaluation && (
                  <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t border-slate-105 dark:border-slate-800 sm:border-none pt-4 sm:pt-0">
                    <div className="text-right">
                      <div className="text-2xl font-display text-emerald-600 dark:text-emerald-400 font-bold">
                        {session.evaluation.overallScore}%
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px] font-medium">
                        {session.evaluation.recommendation}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-indigo-600 group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

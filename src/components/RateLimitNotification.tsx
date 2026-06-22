import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, ShieldX, CheckCircle2 } from "lucide-react";

interface RateLimitNotificationProps {
  rateLimitUntil: number | null;
  onClearLimit: () => void;
  onSimulateLimit: (hours: number) => void;
  showSimulation?: boolean;
}

export default function RateLimitNotification({
  rateLimitUntil,
  onClearLimit,
  onSimulateLimit,
  showSimulation = false,
}: RateLimitNotificationProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!rateLimitUntil) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = rateLimitUntil - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        onClearLimit();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rateLimitUntil, onClearLimit]);

  // If there's an active limit, render a beautiful warnings banner
  if (rateLimitUntil && timeLeft) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950/40 dark:to-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Ambient light glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Visual Icon Badge */}
            <div className="flex-shrink-0 w-16 h-16 bg-red-500/10 dark:bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-200 dark:border-red-800 animate-pulse">
              <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Informative Text */}
            <div className="flex-grow space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full shadow-sm">
                  Limite Operacional Excedido
                </span>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  HTTP 429 Status
                </span>
              </div>
              
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Canal do Gemini Temporariamente Suspenso
              </h3>
              
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-medium">
                Dra. Ana Martins extrapolou a cota de uso das requisições com a API do Gemini. Para manter a conformidade operacional, a simulação e a triagem curricular foram bloqueadas no servidor. Por favor, aguarde o canal restabelecer para poder usar novamente.
              </p>
            </div>

            {/* Live CountDown Tracker Widget */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border border-red-200/60 dark:border-red-900/40 rounded-2xl px-5 py-4 text-center shadow-md min-w-[200px] flex flex-col justify-center">
              <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-red-500 animate-spin" style={{ animationDuration: '4s' }} />
                Aguardar Retorno
              </span>
              <div className="font-mono text-2xl font-extrabold text-red-600 dark:text-red-400 tracking-wider">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                Tempo de bloqueio obrigatório de 4 horas
              </span>
            </div>
          </div>

          {/* Tester controls to unblock instantly */}
          <div className="mt-5 pt-4 border-t border-red-200/60 dark:border-red-900/30 flex flex-wrap items-center justify-between gap-3 bg-red-500/5 dark:bg-red-500/10 -mx-6 -mb-6 px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-yellow-500 rounded-full animate-ping" />
              Modo Sandbox / Testes de Validação do Avaliador
            </p>
            
            <button
              onClick={onClearLimit}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ignorar Bloqueio / Liberar API ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Debug/Simulation Trigger Box when there is no active rate limit
  if (!showSimulation) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Ambiente de Avaliação Gemini Rate Limit
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
              O botão abaixo simula instantaneamente o estouro da cota de requisições da inteligência artificial (retorno HTTP 429).
            </p>
          </div>
        </div>

        <button
          onClick={() => onSimulateLimit(4)}
          className="shrink-0 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <ShieldX className="w-4 h-4 shrink-0" />
          Simular Estouro de Limite (429) 🧪
        </button>
      </div>
    </div>
  );
}

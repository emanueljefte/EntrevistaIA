import React from "react";
import {
  Code,
  ShieldCheck,
  Zap,
  Cpu,
  Bookmark,
  Dribbble,
  Sparkle,
  MessageCircle,
} from "lucide-react";

interface AboutPageProps {
  onBackToHome: () => void;
}

export default function AboutPage({ onBackToHome }: AboutPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 animate-fade-in pb-24 text-slate-700 dark:text-slate-350">
      {/* Title */}
      <div className="mb-10 text-center md:text-left">
        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full inline-block mb-3">
          Sobre a Plataforma
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          EntrevistaIA & Dra. Ana
        </h1>
        <p className="text-sm text-slate-505 dark:text-slate-400 font-medium mt-1">
          Descubra a visão de engenharia por trás do melhor ambiente de simulação profissional do Brasil.
        </p>
      </div>

      {/* Meet Dra Ana Card */}
      <div className="bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 mb-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-700 flex items-center justify-center p-0.5 shadow-lg shrink-0">
            <div className="w-full h-full rounded-1.5xl bg-slate-900 flex flex-col items-center justify-center gap-1">
              <Sparkle className="w-6 h-6 text-indigo-400 animate-pulse" />
              <span className="font-mono text-[9px] text-indigo-300 font-bold tracking-widest uppercase">AI Agent</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 text-slate-100">Dra. Ana: A Recrutadora IA Empática</h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mb-4">
              Diferente de sistemas de testes automáticos ou avaliadores de palavras chaves frios, a <strong>Dra. Ana</strong> foi projetada sob diretrizes empáticas. Ela formula perguntas contextualizadas às suas ambições de carreira, ouve ativamente suas explicações técnica/operacionais, simula cenários complexos do cotidiano e propõe feedbacks baseados em dados reais.
            </p>
            <div className="inline-flex gap-3 text-[10px] font-bold text-indigo-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-lg">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Gemini Pro Active Listening
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Objectives / Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Nossa Missão
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Dar a qualquer candidato — júnior, pleno ou sênior — o poder de tener uma simulação de RH e teste de liderança realista sem custos exorbitantes de mentoria pessoal. Fortalecer a confiança de profissionais técnicos para que suas melhores realizações fiquem evidentes na hora da verdade.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Privacidade e Segurança em Primeiro Lugar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Seus currículos carregados, feedbacks recebidos e conversações no chat são protegidos localmente ou em contas autorizadas por token. Você escolhe se deseja simular de forma anônima (com capacidade restrita) ou registrar uma conta membro para manter um histórico corporativo permanente das suas evoluções.
          </p>
        </div>
      </div>

      {/* Recruiter Module Info */}
      <div className="bg-indigo-50/45 dark:bg-indigo-950/10 border border-indigo-150/60 dark:border-indigo-900/40 rounded-3xl p-6 sm:p-8 mb-12">
        <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-200 mb-3 flex items-center gap-2">
          <Sparkle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Módulo Recrutador & Triagem Corporativa
        </h3>
        <p className="text-xs sm:text-sm text-slate-658 dark:text-slate-350 font-medium leading-relaxed mb-4">
          O novo <strong>Módulo Recrutador</strong> foi desenvolvido especificamente para apoiar profissionais de Recursos Humanos e Gestores de Contratação. Ele permite avaliar, de forma simultânea e centralizada, múltiplos currículos face às exigências detalhadas de uma determinada vaga corporativa.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-600 dark:text-slate-400 font-semibold pl-1">
          <li className="flex items-start gap-2">
            <span className="text-indigo-650 dark:text-indigo-400 font-bold">✓</span>
            <span><strong>Upload Simultâneo:</strong> Carregue arquivos PDF, imagens ou texto simultaneamente para uma análise em lote ágil.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-650 dark:text-indigo-400 font-bold">✓</span>
            <span><strong>Deteção de Duplicados:</strong> Alertas imediatos caso sejam carregados arquivos de currículo que pertençam à mesma pessoa.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-650 dark:text-indigo-400 font-bold">✓</span>
            <span><strong>Alinhamento e Ranking:</strong> Geração de notas de match com base na senioridade e requisitos descritos, com destaque automático para o candidato ideal.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-650 dark:text-indigo-400 font-bold">✓</span>
            <span><strong>Segregação de Segurança:</strong> Contas de Candidatos e Recrutadores são separadas para evitar misturas de perfis, usando o mesmo e-mail de forma isolada.</span>
          </li>
        </ul>
      </div>

      {/* Built Specs */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 mb-12 transition-colors duration-300">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-205 mb-5 flex items-center gap-2">
          <Code className="w-4 h-4 text-indigo-600" />
          Especificações da Ficha Técnica (Stack)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-3xs transition-colors">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Frontend</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">React / TS / Vite</span>
          </div>

          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-3xs transition-colors">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">CSS Framework</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">Tailwind CSS 4.0</span>
          </div>

          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-3xs transition-colors">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">API Inteligente</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">Google Gemini API</span>
          </div>

          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-3xs transition-colors">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Gráficos Analíticos</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">Recharts (Radar/Bar)</span>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="flex justify-center">
        <button
          onClick={onBackToHome}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all inline-flex items-center gap-2"
        >
          <Bookmark className="w-4 h-4" />
          <span>Voltar para Página Inicial</span>
        </button>
      </div>
    </div>
  );
}

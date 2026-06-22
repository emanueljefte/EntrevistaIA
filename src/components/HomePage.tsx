import React from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Users,
  Target,
  ShieldAlert,
} from "lucide-react";

interface HomePageProps {
  onNavigate: (tab: string) => void;
  isGuest: boolean;
  username?: string;
  userRole?: string;
}

export default function HomePage({ onNavigate, isGuest, username, userRole = "candidato" }: HomePageProps) {
  const isRecruiter = userRole === "recrutador";

  // Acionador via teclado para acessibilidade no card interativo
  const handleKeyDown = (e: React.KeyboardEvent, tab: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate(tab);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 animate-fade-in pb-24 text-left">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 lg:p-14 mb-12 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>
 
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Text content */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulador de Entrevistas com Inteligência Artificial</span>
            </div>
 
            <h1 className="font-display text-4xl md:text-5xl lg:text-[44px] xl:text-[52px] font-extrabold tracking-tight leading-[1.1] mb-5">
              {isRecruiter ? (
                <>
                  Triagem Inteligente de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-300">Candidatos com IA</span>
                </>
              ) : (
                <>
                  Domine suas <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-300">Entrevistas Técnicas</span>
                </>
              )}
            </h1>
 
            <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed mb-8 max-w-lg">
              {isRecruiter ? (
                "Acesse recursos corporativos para comparar e ordene múltiplos currículos de forma automatizada e inteligente face aos requisitos das vagas de contratação."
              ) : (
                "Treine com a Dra. Ana, nossa recrutadora virtual inteligente que faz um bate-papo em tempo real personalizado para qualquer vaga e oferece um relatório analítico detalhado com notas por competência."
              )}
            </p>
 
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={() => onNavigate(isRecruiter ? "recruiter" : "setup")}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
              >
                <span>{isRecruiter ? "Acessar Painel de Triagem" : "Iniciar Nova Simulação"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate("about")}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-colors rounded-xl text-xs font-bold uppercase tracking-wider text-center cursor-pointer text-white"
              >
                Como Funciona?
              </button>
            </div>
          </div>

          {/* Hero Right: Styled Capa Banner */}
          <div className="lg:col-span-5 w-full">
            <div className="relative aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group bg-slate-950">
              <div className="absolute inset-0 bg-indigo-900/5 mix-blend-multiply transition-colors group-hover:bg-transparent duration-300 z-10"></div>
              <img
                src="/src/assets/images/interview_hero_cover_1781312795819.jpg"
                alt="Ambiente moderno e acolhedor de entrevista corporativa"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Greetings / Brief status info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-12 shadow-sm transition-colors duration-300">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Bem-vindo(a) de volta</span>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
            Olá, <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{isGuest ? "Visitante Convidado" : username || "Membro"}</span>! Pronto para treinar hoje?
          </h2>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
          <span>Sistemas operacionais e inteligência Dra. Ana prontos para uso</span>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="mb-14">
        <div className="text-center md:text-left mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">Recursos da Plataforma</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Ferramentas pensadas detalhadamente para sua evolução profissional rápida
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-7 hover:shadow-md dark:hover:shadow-neutral-900/30 transition-all duration-300 flex flex-col h-full">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Simulação Interativa Dedicada</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4 flex-1">
              Copie os requisitos da vaga de emprego desejada. A Dra. Ana lê, entende o nível de experiência e gera dinamicamente uma esteira de perguntas personalizadas e lógicas.
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider inline-flex items-center gap-1">
              Gemini 2.5 Flash <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span> Suporta Áudio e Texto
            </span>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-7 hover:shadow-md dark:hover:shadow-neutral-900/30 transition-all duration-300 flex flex-col h-full">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Feedback Gráfico por Competência</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4 flex-1">
              Veja seus pontos fortes e fracos em um gráfico Radar (teia de aranha) ou em Colunas de desempenho, abrangendo Comunicação, Conhecimento Técnico, Proposição de Problemas e KPIs.
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider inline-flex items-center gap-1">
              Painel Interativo <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span> Recharts JS
            </span>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-7 hover:shadow-md dark:hover:shadow-neutral-900/30 transition-all duration-300 flex flex-col h-full">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Análise Curricular Inteligente</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4 flex-1">
              Envie uma versão textual livre ou dados do seu currículo. Receba correções pontuais, sugestões de reformatação de texto, polimento de conquistas e pontos fortes reconhecidos.
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider inline-flex items-center gap-1">
              Foco Prático <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span> Próximos Passos Claros
            </span>
          </div>

          {/* Card 4 - Recrutador Module */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("recruiter")}
            onKeyDown={(e) => handleKeyDown(e, "recruiter")}
            className="bg-gradient-to-tr from-indigo-950 to-slate-900 border border-indigo-950 dark:border-indigo-900/40 rounded-3xl p-6 md:p-7 hover:scale-[1.02] hover:border-indigo-500/40 transition-all duration-300 flex flex-col h-full shadow-lg group relative overflow-hidden outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none transition-transform group-hover:scale-125"></div>
            <div className="absolute top-3 right-3 shrink-0 px-2 py-0.5 bg-indigo-600 text-[8px] font-black uppercase text-white rounded-md tracking-wider">
              Novo 💼
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-5 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">
              Módulo Recrutador ✨
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4 flex-1">
              Compare e ordene múltiplos currículos instantaneamente em relação a uma vaga de contratação. Inclui inteligência Dra. Ana Martins para detetar duplicidades, analisar lacunas e gerar ranking exclusivo. *(Requer conta de Recrutador)*
            </p>
            <span className="text-[10px] text-indigo-400 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5 group-hover:underline">
              Explorar Triagem IA <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-3xl p-6 border border-indigo-100/50 dark:border-indigo-900/30">
        <div className="flex items-start gap-4 p-2">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 mb-1">Dicas Preciosas</h4>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/85 font-medium leading-relaxed">
              Tente ser o mais objetivo e completo possível nas suas respostas de simulador. Quanto melhores e mais realistas forem suas respostas, melhor será a pontuação de "Technical" e "Problem Solving" nos resultados gráficos.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-2">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 mb-1">Acesso Moderado para Visitantes</h4>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/85 font-medium leading-relaxed">
              O administrador do EntrevistaIA pode habilitar ou restringir funções como microfone de áudio, síntese de voz e relatórios de convidados no Painel de Acesso. Personalize conforme desejar!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
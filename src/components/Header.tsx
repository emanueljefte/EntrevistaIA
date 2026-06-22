import React from "react";

interface HeaderProps {
  currentTab: string;
  onTabChange?: (tab: string) => void;
  showExitButton?: boolean;
  onExitClick?: () => void;
  user?: { name: string; email: string; role?: string } | null;
  isGuest?: boolean;
  onLogout?: () => void;
  theme?: "light" | "dark";
  onThemeToggle?: () => void;
}

export default function Header({
  currentTab,
  onTabChange,
  showExitButton = false,
  onExitClick,
  user = null,
  isGuest = false,
  onLogout,
  theme = "light",
  onThemeToggle,
}: HeaderProps) {
  const userRole = user?.role || "candidato";
  const isRecruiter = userRole === "recrutador";

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md fixed top-0 w-full z-50 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-300">
      <div className="flex justify-between items-center px-4 md:px-10 h-16 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange && onTabChange("home")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center p-0.5 shadow-md">
              <span className="material-symbols-outlined text-2xl text-white">target</span>
            </div>
            <span className="text-xl font-display text-slate-900 dark:text-slate-100 font-bold tracking-tight">EntrevistaIA</span>
          </div>
          
          <nav className="hidden md:flex gap-6 ml-8">
            <button
              onClick={() => onTabChange && onTabChange("home")}
              className={`font-body-md text-sm transition-colors cursor-pointer ${
                currentTab === "home"
                  ? "text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1"
                  : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              Início
            </button>
            
            {!isRecruiter && (
              <button
                onClick={() => onTabChange && onTabChange("setup")}
                className={`font-body-md text-sm transition-colors cursor-pointer ${
                  currentTab === "setup"
                    ? "text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1"
                    : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                Configuração
              </button>
            )}

            {isRecruiter && (
              <button
                onClick={() => onTabChange && onTabChange("recruiter")}
                className={`font-body-md text-sm transition-colors cursor-pointer flex items-center gap-1 ${
                  currentTab === "recruiter"
                    ? "text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1"
                    : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                <span className="material-symbols-outlined text-xs">hail</span>
                Recrutador
              </button>
            )}

            {!isRecruiter && (
              <button
                onClick={() => onTabChange && onTabChange("history")}
                className={`font-body-md text-sm transition-colors cursor-pointer ${
                  currentTab === "history"
                    ? "text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1"
                    : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                Histórico
              </button>
            )}

            <button
              onClick={() => onTabChange && onTabChange("permissions")}
              className={`font-body-md text-sm transition-colors cursor-pointer flex items-center gap-1 ${
                currentTab === "permissions"
                  ? "text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1"
                  : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              <span className="material-symbols-outlined text-xs">shield</span>
              Acesso
            </button>
            <button
              onClick={() => onTabChange && onTabChange("about")}
              className={`font-body-md text-sm transition-colors cursor-pointer ${
                currentTab === "about"
                  ? "text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1"
                  : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              Sobre
            </button>
            {currentTab === "result" && !isRecruiter && (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 dark:border-indigo-400 pb-1 font-body-md text-sm cursor-pointer">
                Resultado
              </span>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Switcher Button */}
          <button
            onClick={onThemeToggle}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer border border-slate-200/50 dark:border-slate-700/50 focus:outline-none"
            title={theme === "light" ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
            aria-label="Alternar tema"
          >
            <span className="material-symbols-outlined text-[20px] transition-transform duration-300 hover:rotate-12 select-none">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>

          {showExitButton && onExitClick ? (
            <button
              onClick={onExitClick}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-medium text-xs md:text-sm border border-rose-200"
            >
              <span className="material-symbols-outlined text-sm md:text-lg">close</span>
              Encerrar Entrevista
            </button>
          ) : (
            <>
              {/* User Identity / Access display */}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name}</span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Membro</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-955/35 dark:border-rose-900/30 transition-colors border border-rose-200/50 cursor-pointer"
                    title="Sair da Conta"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </div>
              ) : isGuest ? (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    Convidado ⚡
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-900/35 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Fazer Login
                  </button>
                </div>
              ) : null}
              
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-800 hidden xs:block">
                <img
                  alt="Avatar do usuário"
                  className="w-full h-full object-cover"
                  src={user ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}` : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"}
                  referrerPolicy="no-referrer"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

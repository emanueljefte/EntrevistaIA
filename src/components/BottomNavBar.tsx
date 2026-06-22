import React from "react";

interface BottomNavBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isInterviewActive: boolean;
  userRole?: string;
}

export default function BottomNavBar({
  currentTab,
  onTabChange,
  isInterviewActive,
  userRole = "candidato",
}: BottomNavBarProps) {
  const isRecruiter = userRole === "recrutador";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 shadow-lg px-2 transition-colors duration-300">
      <button
        onClick={() => onTabChange("home")}
        className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
          currentTab === "home" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"
        }`}
      >
        <span className="material-symbols-outlined text-lg">home</span>
        <span className="text-[9px] mt-0.5 font-bold">Início</span>
      </button>

      {!isRecruiter && (
        <button
          onClick={() => onTabChange("setup")}
          className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
            currentTab === "setup" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <span className="material-symbols-outlined text-lg">settings</span>
          <span className="text-[9px] mt-0.5 font-bold">Painel</span>
        </button>
      )}

      {isRecruiter && (
        <button
          onClick={() => onTabChange("recruiter")}
          className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
            currentTab === "recruiter" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <span className="material-symbols-outlined text-lg">hail</span>
          <span className="text-[9px] mt-0.5 font-bold">Triagem</span>
        </button>
      )}

      {!isRecruiter && (
        <button
          onClick={() => isInterviewActive && onTabChange("interview")}
          disabled={!isInterviewActive}
          className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
            !isInterviewActive ? "opacity-25 cursor-not-allowed" : ""
          } ${currentTab === "interview" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"}`}
        >
          <span className="material-symbols-outlined text-lg">forum</span>
          <span className="text-[9px] mt-0.5 font-bold">Chat</span>
        </button>
      )}

      {!isRecruiter && (
        <button
          onClick={() => onTabChange("history")}
          className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
            currentTab === "history" || currentTab === "result"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <span className="material-symbols-outlined text-lg">analytics</span>
          <span className="text-[9px] mt-0.5 font-bold">Histórico</span>
        </button>
      )}

      <button
        onClick={() => onTabChange("permissions")}
        className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
          currentTab === "permissions"
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"
        }`}
      >
        <span className="material-symbols-outlined text-lg">shield</span>
        <span className="text-[9px] mt-0.5 font-bold">Acesso</span>
      </button>

      <button
        onClick={() => onTabChange("about")}
        className={`flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 flex-1 ${
          currentTab === "about" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300"
        }`}
      >
        <span className="material-symbols-outlined text-lg">info</span>
        <span className="text-[9px] mt-0.5 font-bold">Sobre</span>
      </button>
    </nav>
  );
}

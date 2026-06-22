import React, { useState } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthPageProps {
  onAuthSuccess: (token: string, user: AuthUser) => void;
  onContinueAsGuest: () => void;
}

type AuthMode = "login" | "signup" | "recover" | "reset";

export default function AuthPage({ onAuthSuccess, onContinueAsGuest }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"candidato" | "recrutador">("candidato");
  
  // Recovery values
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleClearStates = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setResetCode("");
    setRole("candidato");
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    handleClearStates();
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Por favor, informe o e-mail e a senha.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Flha ao fazer login.");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg("Todos os campos são obrigatórios.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("As senhas informadas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao registrar usuário.");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao registrar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Request recovery code
  const handleRecoverRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Infrome o e-mail cadastrado.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "E-mail não localizado.");
      }

      if (data.resetCode) {
        setSessionCode(data.resetCode);
        setSuccessMsg(`Código de redefinição enviado com sucesso! Para fins de teste em sandbox, copie o código gerado: ${data.resetCode}`);
        setResetCode(data.resetCode); // auto-fill for frictionless sandbox experience
        setTimeout(() => {
          setMode("reset");
        }, 3000);
      } else {
        setSuccessMsg("Código enviado para seu e-mail cadastrado.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de servidor ao solicitar redefinição.");
    } finally {
      setIsLoading(false);
    }
  };

  // Do actual password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword) {
      setErrorMsg("Preencha o código de redefinição e nova senha.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("A nova senha deve possuir ao menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Código inválido ou senha incorreta.");
      }

      setSuccessMsg("Sua senha foi atualizada com sucesso! Redirecionando para o login...");
      setTimeout(() => {
        switchMode("login");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao processar redefinição.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-3xl shadow-sm animate-fade-in flex flex-col gap-6 transition-all">
        
        {/* Branding Logo */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="material-symbols-outlined text-2xl font-bold">award_star</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display">EntrevistaIA</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">Aprimore sua carreira com simulações de IA</p>
          </div>
        </div>

        {/* Global Alert Notification */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl text-center animate-pulse">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl text-center">
            {successMsg}
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-800">Boas-vindas de volta!</h2>
              <p className="text-xs text-slate-500 font-medium">Faça login para salvar seu histórico e dicas de preparação.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço de E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Senha Compartilhada</label>
                <button
                  type="button"
                  onClick={() => switchMode("recover")}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400 pr-12 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Autenticando...</span>
                </>
              ) : (
                "Entrar na Plataforma"
              )}
            </button>

            <div className="text-center text-xs text-slate-500 font-medium mt-1">
              Novo no EntrevistaIA?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="text-indigo-600 font-bold hover:underline"
              >
                Crie sua conta grátis
              </button>
            </div>
          </form>
        )}

        {/* MODE: SIGNUP */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-800">Registe sua conta</h2>
              <p className="text-xs text-slate-500 font-medium">Salve seu histórico de simulações e visualize diagnóstico sob demanda.</p>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seu Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Exemplo: João Silva"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço de E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmar</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest">Tipo de Perfil</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("candidato")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    role === "candidato"
                      ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-500"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Candidato
                </button>
                <button
                  type="button"
                  onClick={() => setRole("recrutador")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    role === "recrutador"
                      ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-500"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Recrutador
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Criando registro...</span>
                </>
              ) : (
                "Criar Conta e Entrar"
              )}
            </button>

            <div className="text-center text-xs text-slate-500 font-medium mt-1">
              Já possui conta cadastrada?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-indigo-600 font-bold hover:underline"
              >
                Faça login
              </button>
            </div>
          </form>
        )}

        {/* MODE: RECOVER REQUEST */}
        {mode === "recover" && (
          <form onSubmit={handleRecoverRequest} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-800">Identifique sua conta</h2>
              <p className="text-xs text-slate-500 font-medium">Insira o e-mail cadastrado. Um código temporário de redefinição de 6 dígitos será enviado.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço de E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all"
            >
              {isLoading ? "Solicitando..." : "Solicitar Código de Redefinição"}
            </button>

            <div className="flex justify-between text-xs font-semibold mt-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-slate-500 hover:text-slate-800"
              >
                ← Voltar para o Login
              </button>
            </div>
          </form>
        )}

        {/* MODE: RESET PASSWORD */}
        {mode === "reset" && (
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-800">Defina sua nova senha</h2>
              <p className="text-xs text-slate-500 font-medium">Informe o código que apareceu em nosso sandbox e digite a nova senha pretendida.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código de 6 dígitos</label>
              <input
                type="text"
                maxLength={6}
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="Exemplo: 123456"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-950 focus:outline-none transition-all text-center tracking-widest font-mono font-bold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nova Senha</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all"
            >
              {isLoading ? "Salvando..." : "Atualizar Senha & Acessar"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-center text-xs text-slate-500 font-semibold hover:text-slate-800"
            >
              Cancelar e Voltar ao Login
            </button>
          </form>
        )}

        {/* Guest Access Alternative */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-col items-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-3">Ou acesse imediatamente</p>
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="px-6 py-2.5 w-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 text-slate-650 dark:text-slate-300 transition-all rounded-xl text-xs font-bold font-display cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
          >
            Acessar no Modo Convidado 🛡️
          </button>
        </div>

      </div>
    </div>
  );
}

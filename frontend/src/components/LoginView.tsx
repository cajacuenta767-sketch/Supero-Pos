import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Building2,
  AlertTriangle,
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
  KeyRound,
} from 'lucide-react';
import { useAuthStore, DEMO_BRANCHES } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

export const LoginView: React.FC = () => {
  const {
    login,
    isLocked,
    failedAttempts,
    lockoutUntil,
    selectedBranchId,
    setSelectedBranchId,
    resetLockout,
    checkLockStatus,
  } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('SuperoPOS2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Check lockout expiration timer
  useEffect(() => {
    checkLockStatus();
    if (isLocked && lockoutUntil) {
      const interval = setInterval(() => {
        const diff = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
        setRemainingTime(diff);
        if (diff <= 0) {
          checkLockStatus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockoutUntil, checkLockStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (checkLockStatus()) {
      setErrorMessage('Cuenta bloqueada por superar el límite de 5 intentos fallidos. Intente más tarde.');
      return;
    }

    if (!username.trim()) {
      setErrorMessage('Por favor ingrese su usuario.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor ingrese su contraseña.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password, selectedBranchId);

      if (result.success) {
        setSuccessMessage('¡Autenticación exitosa! Redirigiendo...');
      } else {
        setErrorMessage(result.error || 'Error al iniciar sesión. Verifique sus credenciales.');
      }
    } catch {
      setErrorMessage('Ocurrió un error inesperado. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoUser = (userType: 'admin' | 'supervisor' | 'cajero' | 'almacenero') => {
    if (isLocked) return;
    setErrorMessage(null);
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('SuperoPOS2026');
    } else if (userType === 'supervisor') {
      setUsername('supervisor');
      setPassword('supervisor123');
    } else if (userType === 'cajero') {
      setUsername('cajero');
      setPassword('cajero123');
    } else if (userType === 'almacenero') {
      setUsername('almacenero');
      setPassword('almacen123');
    }
  };

  const selectedBranchObj =
    DEMO_BRANCHES.find((b) => b.id === selectedBranchId) || DEMO_BRANCHES[0];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 p-4 transition-colors duration-200 font-sans select-none">
      {/* Background Decorator */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/10 pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#0B0C10] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2833] p-8 relative z-10">
        {/* Header Header & Theme Switcher */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-500/30">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                SUPERO POS
              </h1>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">
                Enterprise Terminal v2.0
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#1F2833] transition-colors"
            title="Cambiar tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
        </div>

        {/* 5-Failed Attempts Locked Banner */}
        {isLocked && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 animate-pulse">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm text-rose-900 dark:text-rose-100">
                  ¡Cuenta Bloqueada por Seguridad!
                </h3>
                <p className="text-xs mt-1 text-rose-700 dark:text-rose-300 leading-relaxed">
                  Se ha superado el límite máximo de 5 intentos fallidos. El acceso ha sido restringido temporalmente.
                </p>
                {remainingTime > 0 && (
                  <p className="text-xs font-mono font-bold mt-2 text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/80 px-2 py-1 rounded inline-block">
                    Tiempo restante: {Math.floor(remainingTime / 60)}m {remainingTime % 60}s
                  </p>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={resetLockout}
                    className="text-xs font-semibold underline text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white transition-colors"
                  >
                    Desbloquear cuenta (Modo Demo QA)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Error Alert Banner */}
        {!isLocked && errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-semibold block mb-0.5">Error de Autenticación</span>
              <span>{errorMessage}</span>
              {failedAttempts > 0 && (
                <div className="mt-2 flex items-center space-x-1">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    Intentos fallidos registrados:
                  </span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <span
                        key={num}
                        className={`w-2.5 h-2.5 rounded-full ${
                          num <= failedAttempts
                            ? 'bg-rose-500 dark:bg-rose-400'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold font-mono ml-1 text-rose-600 dark:text-rose-400">
                    {failedAttempts}/5
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Sucursal de Operación</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={isSubmitting || isLocked}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {DEMO_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 pl-1 truncate">
              {selectedBranchObj.address}
            </p>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>Nombre de Usuario</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. admin o cajero"
              disabled={isSubmitting || isLocked}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              <span>Contraseña</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting || isLocked}
                className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Processing / Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verificando...</span>
              </>
            ) : isLocked ? (
              <>
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Cuenta Bloqueada (5/5)</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Iniciar Sesión en POS</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Fill Helpers */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#1F2833]">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-2 text-center uppercase tracking-wider">
            Accesos de Prueba Rápida (Demo)
          </p>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => fillDemoUser('admin')}
              disabled={isLocked}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#121212] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-gray-200 dark:border-[#1F2833] text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser('supervisor')}
              disabled={isLocked}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#121212] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-gray-200 dark:border-[#1F2833] text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              Supervis.
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser('cajero')}
              disabled={isLocked}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#121212] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-gray-200 dark:border-[#1F2833] text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              Cajero
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser('almacenero')}
              disabled={isLocked}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#121212] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-gray-200 dark:border-[#1F2833] text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              Almacén
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

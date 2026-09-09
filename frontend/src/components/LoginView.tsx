import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Moon,
  ShieldAlert,
  Sun,
  User,
} from 'lucide-react';
import { useAuthStore, DEMO_BRANCHES } from '../store/useAuthStore';
import { DEMO_ACCOUNTS, type DemoAccount } from '../config/demoUsers';
import { useThemeStore } from '../store/useThemeStore';
import { Badge, Button, IconButton, Input, Select, cn } from '../ui';

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

  /* El formulario ya no llega relleno: traía la contraseña de administrador
     escrita en el campo, así que el build de producción se instalaba con ella a
     la vista. */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    checkLockStatus();
    if (!isLocked || !lockoutUntil) return;
    const t = setInterval(() => {
      const diff = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setRemainingTime(diff);
      if (diff <= 0) checkLockStatus();
    }, 1000);
    return () => clearInterval(t);
  }, [isLocked, lockoutUntil, checkLockStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (checkLockStatus()) {
      setErrorMessage('Cuenta bloqueada tras 5 intentos fallidos. Intente más tarde.');
      return;
    }
    if (!username.trim()) return setErrorMessage('Ingrese su usuario.');
    if (!password) return setErrorMessage('Ingrese su contraseña.');

    setIsSubmitting(true);
    try {
      const result = await login(username.trim(), password, selectedBranchId);
      if (result.success) setSuccessMessage('Autenticación correcta. Abriendo terminal…');
      else setErrorMessage(result.error || 'Credenciales incorrectas.');
    } catch {
      setErrorMessage('Ocurrió un error inesperado. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (account: DemoAccount) => {
    if (isLocked) return;
    setErrorMessage(null);
    setUsername(account.user);
    setPassword(account.pass);
  };

  return (
    <div className="min-h-screen w-full flex bg-canvas text-ink select-none">
      {/* Panel de marca: el producto se presenta antes de pedir credenciales */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-surface border-r border-line relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-accent/[0.07] blur-3xl pointer-events-none"
        />
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-md bg-accent text-white flex items-center justify-center font-bold text-display">
            S
          </div>
          <div>
            <p className="text-title text-ink leading-tight">SUPERO POS</p>
            <p className="text-micro uppercase text-ink-3">Enterprise Terminal v2.0</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-4">
          <h2 className="text-hero text-ink leading-[1.05]">
            Vender
            <br />
            sin mirar
            <br />
            la pantalla.
          </h2>
          <p className="text-base text-ink-2 leading-relaxed">
            Terminal de punto de venta con operación offline, lectura láser, control de IMEI y venta
            a granel. Diseñada para la hora número nueve del turno.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <Badge tone="success" size="md">
            Offline-first
          </Badge>
          <Badge tone="accent" size="md">
            Escaneo &lt; 10 ms
          </Badge>
          <Badge tone="neutral" size="md">
            Kardex ACID
          </Badge>
        </div>
      </div>

      {/* Panel de acceso */}
      <div className="w-full lg:w-[480px] shrink-0 flex flex-col justify-center p-8 sm:p-12">
        <div className="flex items-center justify-between mb-8">
          <div className="lg:hidden min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-md bg-accent text-white flex items-center justify-center font-bold text-title">
                S
              </div>
              <div className="min-w-0">
                <p className="text-title text-ink leading-tight">SUPERO POS</p>
                <p className="text-micro uppercase text-ink-3">Vender sin mirar la pantalla</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-display text-ink">Iniciar sesión</h1>
            <p className="text-base text-ink-2 mt-1">Identifíquese para abrir la terminal.</p>
          </div>
          <IconButton
            label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </IconButton>
        </div>

        {isLocked && (
          <div className="mb-6 p-4 rounded-md bg-danger-soft border border-danger/30 space-y-2">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-base font-bold text-danger-ink">Cuenta bloqueada</p>
                <p className="text-body text-danger-ink/90">
                  Se superó el límite de 5 intentos fallidos. El acceso está restringido
                  temporalmente.
                </p>
                {remainingTime > 0 && (
                  <p className="font-mono tnum text-body font-bold text-danger-ink">
                    Tiempo restante: {Math.floor(remainingTime / 60)}m {remainingTime % 60}s
                  </p>
                )}
                <button
                  type="button"
                  onClick={resetLockout}
                  className="text-body font-semibold underline text-danger-ink hover:opacity-80"
                >
                  Desbloquear (modo demo QA)
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Sucursal"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={isLocked}
          >
            {DEMO_BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>

          <Input
            id="username"
            label="Usuario"
            leading={<User className="w-4 h-4" />}
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLocked}
            autoComplete="username"
            inputSize="lg"
          />

          <Input
            id="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            leading={<Lock className="w-4 h-4" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="text-ink-3 hover:text-ink transition-colors duration-fast"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLocked}
            autoComplete="current-password"
            inputSize="lg"
          />

          {failedAttempts > 0 && !isLocked && (
            <p className="text-body text-warn-ink flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Intento {failedAttempts} de 5.
            </p>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-danger-soft border border-danger/25 text-body text-danger-ink">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-ok-soft border border-ok/25 text-body text-ok-ink">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              {successMessage}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            block
            loading={isSubmitting}
            disabled={isLocked}
            icon={!isSubmitting ? <KeyRound className="w-4 h-4" /> : undefined}
          >
            {isSubmitting ? 'Verificando…' : 'Entrar a la terminal'}
          </Button>
        </form>

        {/* Solo en modo demostración: en producción `DEMO_ACCOUNTS` está vacío y
            este bloque no llega a renderizarse ni sus cadenas al bundle. */}
        {DEMO_ACCOUNTS.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <p className="text-micro uppercase text-ink-3 mb-2.5">Acceso rápido de demostración</p>
            <div className="grid grid-cols-4 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.user}
                  type="button"
                  onClick={() => fillDemo(account)}
                  disabled={isLocked}
                  className={cn(
                    'h-9 rounded-md border border-line bg-raised text-body font-semibold text-ink-2',
                    'hover:border-accent hover:text-accent transition-colors duration-fast ease-ease',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

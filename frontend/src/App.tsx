import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { PosView } from './components/PosView';
import { DashboardView } from './components/DashboardView';
import { UsersView } from './components/UsersView';
import { ContactsView } from './components/ContactsView';
import { ProductsView } from './components/ProductsView';
import { PurchasesView } from './components/PurchasesView';
import { TransfersView } from './components/TransfersView';
import { StockAdjustmentsView } from './components/StockAdjustmentsView';
import { ExpensesView } from './components/ExpensesView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { FinanceView } from './components/FinanceView';
import { NotificationsView } from './components/NotificationsView';
import { SettingsView } from './components/SettingsView';
import { HrAttendanceView } from './components/HrAttendanceView';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useAuthStore } from './store/useAuthStore';
import { canAccessView, VIEW_PERMISSIONS } from './utils/permissions';
import { EmptyState, ErrorBoundary, ToastProvider } from './ui';

const VIEWS: Record<string, React.ComponentType> = {
  home: DashboardView,
  pos: PosView,
  users: UsersView,
  contacts: ContactsView,
  products: ProductsView,
  purchases: PurchasesView,
  transfers: TransfersView,
  'stock-adjust': StockAdjustmentsView,
  expenses: ExpensesView,
  accounts: FinanceView,
  reports: SalesHistoryView,
  notifications: NotificationsView,
  settings: SettingsView,
  hr: HrAttendanceView,
};

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  /* Antes esto caía a 'ADMIN' cuando el perfil no traía rol: un fallo al cargar
     el usuario abría toda la administración. Sin rol no se accede a nada. */
  const userRole = user?.role;
  const [activeTab, setActiveTab] = useState('pos');
  const [searchQuery, setSearchQuery] = useState('');

  // Hook de sincronización offline (listeners pasivos + worker de 30 s)
  useOfflineSync();

  /* La pestaña efectiva se deriva en el render, no con un efecto que provocaría
     un render en cascada. Antes solo se corregía al almacenero y solo en tres
     pestañas, de modo que un cajero podía abrir Usuarios o Ajustes escribiendo
     la pestaña; ahora se comprueba el permiso de cualquier apartado. */
  const effectiveTab = canAccessView(userRole, activeTab)
    ? activeTab
    : (Object.keys(VIEW_PERMISSIONS).find((view) => canAccessView(userRole, view)) ?? null);

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <LoginView />
      </ToastProvider>
    );
  }

  const ActiveView = effectiveTab ? VIEWS[effectiveTab] : undefined;

  return (
    <ToastProvider>
      <div className="flex h-screen bg-canvas text-ink overflow-hidden">
        <Sidebar activeTab={effectiveTab ?? ''} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          <main className="flex-1 overflow-hidden">
            {ActiveView ? (
              /* Cada apartado va contenido: un fallo de render aquí dejaba la
                 pantalla en blanco y obligaba a reiniciar la terminal. La clave
                 fuerza el remontado al cambiar de vista. */
              <ErrorBoundary
                key={effectiveTab ?? 'sin-vista'}
                label={effectiveTab ?? 'apartado'}
                onReset={() => setActiveTab('pos')}
              >
                <ActiveView />
              </ErrorBoundary>
            ) : (
              <EmptyState
                icon={<ShieldAlert className="w-6 h-6" />}
                title="Sin acceso a este apartado"
                hint={
                  userRole
                    ? `Su rol (${userRole}) no tiene permiso sobre este módulo. Solicítelo a un administrador.`
                    : 'Su usuario no tiene un rol asignado. Solicítelo a un administrador.'
                }
              />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;

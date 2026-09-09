import React, { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
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
import { EmptyState, ToastProvider } from './ui';

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
  const userRole = user?.role || 'ADMIN';
  const [activeTab, setActiveTab] = useState('pos');
  const [searchQuery, setSearchQuery] = useState('');

  // Hook de sincronización offline (listeners pasivos + worker de 30 s)
  useOfflineSync();

  /* El almacenero no opera caja ni administra: se deriva su vista efectiva
     en el render en lugar de corregirla con un efecto, que provocaría un
     render en cascada por cada cambio de pestaña. */
  const effectiveTab =
    userRole === 'ALMACENERO' && ['pos', 'users', 'settings'].includes(activeTab)
      ? 'products'
      : activeTab;

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <LoginView />
      </ToastProvider>
    );
  }

  const ActiveView = VIEWS[effectiveTab];

  return (
    <ToastProvider>
      <div className="flex h-screen bg-canvas text-ink overflow-hidden">
        <Sidebar activeTab={effectiveTab} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          <main className="flex-1 overflow-hidden">
            {ActiveView ? (
              <ActiveView />
            ) : (
              <EmptyState
                icon={<LayoutGrid className="w-6 h-6" />}
                title={`Módulo ${effectiveTab}`}
                hint="Este módulo está configurado con permisos estables para su rol de usuario."
              />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;

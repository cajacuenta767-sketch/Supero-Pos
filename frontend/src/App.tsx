import React, { useState, useEffect } from 'react';
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

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const [activeTab, setActiveTab] = useState('pos');
  const [searchQuery, setSearchQuery] = useState('');

  // Activar Hook de Sincronización Offline (Listeners pasivos & worker activo de 30s)
  useOfflineSync();

  // Auto-switch initial tab if role does not have access to 'pos' (e.g. ALMACENERO)
  useEffect(() => {
    if (userRole === 'ALMACENERO' && (activeTab === 'pos' || activeTab === 'users' || activeTab === 'settings')) {
      setActiveTab('products');
    }
  }, [userRole]);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
      {/* 13-Module Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* View Routing */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'home' && <DashboardView />}
          {activeTab === 'pos' && <PosView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'contacts' && <ContactsView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'purchases' && <PurchasesView />}
          {activeTab === 'transfers' && <TransfersView />}
          {activeTab === 'stock-adjust' && <StockAdjustmentsView />}
          {activeTab === 'expenses' && <ExpensesView />}
          {activeTab === 'accounts' && <FinanceView />}
          {activeTab === 'reports' && <SalesHistoryView />}
          {activeTab === 'notifications' && <NotificationsView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'hr' && <HrAttendanceView />}
          {activeTab !== 'home' &&
            activeTab !== 'pos' &&
            activeTab !== 'users' &&
            activeTab !== 'contacts' &&
            activeTab !== 'products' &&
            activeTab !== 'purchases' &&
            activeTab !== 'transfers' &&
            activeTab !== 'stock-adjust' &&
            activeTab !== 'expenses' &&
            activeTab !== 'accounts' &&
            activeTab !== 'reports' &&
            activeTab !== 'notifications' &&
            activeTab !== 'settings' &&
            activeTab !== 'hr' && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-[#000000]">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <span className="font-bold text-xl">{activeTab.toUpperCase().substring(0, 2)}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Módulo: {activeTab.toUpperCase()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-2">
                  Este módulo está configurado con permisos estables para su rol de usuario.
                </p>
              </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default App;

import React, { lazy, Suspense, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { PosView } from './components/PosView';

/* Carga diferida de los apartados de administración.
 *
 * Todo iba en un solo paquete de 478 KB: la pantalla de acceso descargaba las
 * quince vistas antes de que nadie hubiera entrado. El punto de venta se queda
 * en el paquete inicial porque es la primera pantalla de trabajo y no debe
 * esperar a nada. */
const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView })),
);
const UsersView = lazy(() =>
  import('./components/UsersView').then((m) => ({ default: m.UsersView })),
);
const ContactsView = lazy(() =>
  import('./components/ContactsView').then((m) => ({ default: m.ContactsView })),
);
const ProductsView = lazy(() =>
  import('./components/ProductsView').then((m) => ({ default: m.ProductsView })),
);
const PurchasesView = lazy(() =>
  import('./components/PurchasesView').then((m) => ({ default: m.PurchasesView })),
);
const TransfersView = lazy(() =>
  import('./components/TransfersView').then((m) => ({ default: m.TransfersView })),
);
const StockAdjustmentsView = lazy(() =>
  import('./components/StockAdjustmentsView').then((m) => ({ default: m.StockAdjustmentsView })),
);
const ExpensesView = lazy(() =>
  import('./components/ExpensesView').then((m) => ({ default: m.ExpensesView })),
);
const SalesHistoryView = lazy(() =>
  import('./components/SalesHistoryView').then((m) => ({ default: m.SalesHistoryView })),
);
const FinanceView = lazy(() =>
  import('./components/FinanceView').then((m) => ({ default: m.FinanceView })),
);
const NotificationsView = lazy(() =>
  import('./components/NotificationsView').then((m) => ({ default: m.NotificationsView })),
);
const SettingsView = lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView })),
);
const HrAttendanceView = lazy(() =>
  import('./components/HrAttendanceView').then((m) => ({ default: m.HrAttendanceView })),
);

import { useOfflineSync } from './hooks/useOfflineSync';
import { useAuthStore } from './store/useAuthStore';
import { canAccessView, VIEW_PERMISSIONS } from './utils/permissions';
import { EmptyState, ErrorBoundary, Skeleton, ToastProvider } from './ui';

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

/** Silueta del apartado mientras se descarga su código. */
const ViewSkeleton: React.FC = () => (
  <div className="h-full p-6 space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <Skeleton className="h-9 w-full max-w-md" />
    <Skeleton className="h-64 w-full" />
  </div>
);

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
                {/* Mientras llega el trozo del apartado se muestra su forma, no
                    un vacío: un salto en blanco parece un fallo. */}
                <Suspense fallback={<ViewSkeleton />}>
                  <ActiveView />
                </Suspense>
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

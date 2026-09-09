import React from 'react';
import { 
  Home, Users, Contact, Package, ShoppingCart, ShoppingBag, 
  ArrowLeftRight, Sliders, DollarSign, CreditCard, BarChart3, 
  Bell, Settings, Sun, Moon, UserCheck, LogOut
} from 'lucide-react';
import { useAuthStore, UserRole } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const userRole = user?.role || 'ADMIN';

  const menuItems: SidebarItem[] = [
    { id: 'home', name: '1. Hogar (Dashboard)', icon: <Home className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO'] },
    { id: 'users', name: '2. Gestión de Usuarios', icon: <Users className="w-5 h-5" />, roles: ['ADMIN'] },
    { id: 'contacts', name: '3. Contactos', icon: <Contact className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'products', name: '4. Productos', icon: <Package className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
    { id: 'purchases', name: '5. Compras y Abastecimiento', icon: <ShoppingCart className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
    { id: 'pos', name: '6. Vender (POS)', icon: <ShoppingBag className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
    { id: 'transfers', name: '7. Transferencias y Traspasos', icon: <ArrowLeftRight className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
    { id: 'stock-adjust', name: '8. Ajuste de Stock & Mermas', icon: <Sliders className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
    { id: 'expenses', name: '9. Gastos Operativos', icon: <DollarSign className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'accounts', name: '10. Cuentas Pago/Cobro', icon: <CreditCard className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'reports', name: '11. Historial Ventas & Informes', icon: <BarChart3 className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
    { id: 'notifications', name: '12. Plantillas Notificación & Tickets', icon: <Bell className="w-5 h-5" />, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'settings', name: '13. Ajustes', icon: <Settings className="w-5 h-5" />, roles: ['ADMIN'] },
    { id: 'hr', name: '14. Recursos Humanos & Fichaje', icon: <UserCheck className="w-5 h-5" />, roles: ['ADMIN'] },
  ];

  // RBAC Filter: Show allowed sidebar modules
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-white dark:bg-[#0B0C10] border-r border-gray-200 dark:border-[#1F2833] flex flex-col justify-between transition-colors duration-200 h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#1F2833] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              S
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-none text-base">SUPERO POS</h1>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Enterprise v2.0</span>
            </div>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="p-3 mx-3 my-3 bg-gray-100 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#1F2833] flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'Juan Pérez (Cajero)'}</p>
            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              {userRole || 'CAJERO'}
            </span>
          </div>
        </div>

        {/* 13-Module Menu List */}
        <nav className="px-2 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
          {visibleItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#121212]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Theme Switcher & Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-[#1F2833] space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#121212] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#1F2833] transition-colors"
        >
          <span className="flex items-center space-x-2">
            {isDarkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>{isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded font-mono bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {isDarkMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

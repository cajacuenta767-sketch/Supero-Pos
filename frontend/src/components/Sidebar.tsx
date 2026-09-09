import React, { useState } from 'react';
import {
  Home, Users, Contact, Package, ShoppingCart, ShoppingBag,
  ArrowLeftRight, Sliders, DollarSign, CreditCard, BarChart3,
  Bell, Settings, Sun, Moon, UserCheck, LogOut,
} from 'lucide-react';
import { useAuthStore, UserRole } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { cn } from '../ui';

interface SidebarItem {
 id: string;
 name: string;
 icon: React.ReactNode;
 roles: UserRole[];
}

interface SidebarGroup {
 label: string;
 items: SidebarItem[];
}

interface SidebarProps {
 activeTab: string;
 setActiveTab: (tab: string) => void;
}

const ico = 'w-[18px] h-[18px]';

/* Agrupado por intención de uso, no por numeración de especificación. */
const GROUPS: SidebarGroup[] = [
  {
 label: 'Operación',
 items: [
      { id: 'home', name: 'Hogar', icon: <Home className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO'] },
      { id: 'pos', name: 'Vender', icon: <ShoppingBag className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
      { id: 'purchases', name: 'Compras', icon: <ShoppingCart className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
      { id: 'transfers', name: 'Transferencias', icon: <ArrowLeftRight className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
    ],
  },
  {
 label: 'Catálogo',
 items: [
      { id: 'products', name: 'Productos', icon: <Package className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
      { id: 'contacts', name: 'Contactos', icon: <Contact className={ico} />, roles: ['ADMIN', 'SUPERVISOR'] },
      { id: 'stock-adjust', name: 'Ajuste de Stock', icon: <Sliders className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'ALMACENERO'] },
    ],
  },
  {
 label: 'Gestión',
 items: [
      { id: 'reports', name: 'Informes', icon: <BarChart3 className={ico} />, roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
      { id: 'accounts', name: 'Cuentas', icon: <CreditCard className={ico} />, roles: ['ADMIN', 'SUPERVISOR'] },
      { id: 'expenses', name: 'Gastos', icon: <DollarSign className={ico} />, roles: ['ADMIN', 'SUPERVISOR'] },
      { id: 'users', name: 'Usuarios', icon: <Users className={ico} />, roles: ['ADMIN'] },
      { id: 'hr', name: 'Recursos Humanos', icon: <UserCheck className={ico} />, roles: ['ADMIN'] },
      { id: 'notifications', name: 'Notificaciones', icon: <Bell className={ico} />, roles: ['ADMIN', 'SUPERVISOR'] },
      { id: 'settings', name: 'Ajustes', icon: <Settings className={ico} />, roles: ['ADMIN'] },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
 const { user, logout } = useAuthStore();
 const { isDarkMode, toggleTheme } = useThemeStore();
 const [open, setOpen] = useState(false);

 const userRole = user?.role || 'ADMIN';
 const initials = (user?.name || 'Usuario')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  /* Riel de 72px que expande a 248px al hover: +176px para el catálogo del POS. */
 return (
    <aside
 onMouseEnter={() => setOpen(true)}
 onMouseLeave={() => setOpen(false)}
 className={cn(
        'shrink-0 h-screen bg-surface border-r border-line flex flex-col',
        'transition-[width] duration-base ease-ease select-none z-30',
 open ? 'w-[248px]' : 'w-[72px]',
      )}
    >
      {/* Marca */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-line shrink-0">
        <div className="w-9 h-9 shrink-0 rounded-md bg-accent text-white flex items-center justify-center font-bold text-title">
          S
        </div>
        <div className={cn('min-w-0 transition-opacity duration-base ease-ease', open ? 'opacity-100' : 'opacity-0')}>
          <p className="text-base font-bold text-ink leading-tight whitespace-nowrap">SUPERO POS</p>
          <p className="text-micro text-ink-3 whitespace-nowrap">Enterprise v2.0</p>
        </div>
      </div>

      {/* Navegación agrupada */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {GROUPS.map((group) => {
 const visible = group.items.filter((i) => i.roles.includes(userRole));
 if (visible.length === 0) return null;

 return (
            <div key={group.label} className="mb-4 last:mb-0">
              <p
 className={cn(
                  'px-5 mb-1.5 text-micro uppercase text-ink-3 whitespace-nowrap',
                  'transition-opacity duration-base ease-ease',
 open ? 'opacity-100' : 'opacity-0',
                )}
              >
                {group.label}
              </p>

              <div className="px-2 space-y-0.5">
                {visible.map((item) => {
 const isActive = activeTab === item.id;
 return (
                    <button
 key={item.id}
 onClick={() => setActiveTab(item.id)}
 title={item.name}
 aria-current={isActive ? 'page' : undefined}
 className={cn(
                        'relative w-full h-11 flex items-center gap-3 px-[14px] rounded-md',
                        'text-base font-medium transition-colors duration-fast ease-ease',
 isActive
                          ? 'bg-accent-soft text-accent-ink'
 : 'text-ink-2 hover:bg-sunken hover:text-ink',
                      )}
                    >
                      {/* Barra de acento en lugar de bloque azul sólido */}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />
                      )}
                      <span className="shrink-0">{item.icon}</span>
                      <span
 className={cn(
                          'whitespace-nowrap transition-opacity duration-base ease-ease',
 open ? 'opacity-100' : 'opacity-0',
                        )}
                      >
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Usuario, tema y salida */}
      <div className="border-t border-line p-2 space-y-0.5 shrink-0">
        <div className="h-11 flex items-center gap-3 px-[14px]">
          <span className="w-7 h-7 shrink-0 rounded-full bg-sunken text-ink-2 flex items-center justify-center text-micro font-bold">
            {initials}
          </span>
          <div className={cn('min-w-0 transition-opacity duration-base ease-ease', open ? 'opacity-100' : 'opacity-0')}>
            <p className="text-body font-semibold text-ink truncate leading-tight">{user?.name || 'Usuario'}</p>
            <p className="text-micro text-ink-3">{userRole}</p>
          </div>
        </div>

        <button
 onClick={toggleTheme}
 title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
 className="w-full h-11 flex items-center gap-3 px-[14px] rounded-md text-base font-medium text-ink-2 hover:bg-sunken hover:text-ink transition-colors duration-fast ease-ease"
        >
          <span className="shrink-0">
            {isDarkMode ? <Moon className={ico} /> : <Sun className={ico} />}
          </span>
          <span className={cn('whitespace-nowrap transition-opacity duration-base ease-ease', open ? 'opacity-100' : 'opacity-0')}>
            {isDarkMode ? 'Modo oscuro' : 'Modo claro'}
          </span>
        </button>

        <button
 onClick={logout}
 title="Cerrar sesión"
 className="w-full h-11 flex items-center gap-3 px-[14px] rounded-md text-base font-medium text-ink-2 hover:bg-danger-soft hover:text-danger transition-colors duration-fast ease-ease"
        >
          <span className="shrink-0"><LogOut className={ico} /></span>
          <span className={cn('whitespace-nowrap transition-opacity duration-base ease-ease', open ? 'opacity-100' : 'opacity-0')}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Wallet, 
  Download, 
  AlertTriangle, 
  Info, 
  Calendar, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  BarChart3, 
  LineChart as LineChartIcon,
  CreditCard,
  QrCode,
  Banknote,
  Store,
  PlusCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface DashboardViewProps {
 onNavigateToPos?: () => void;
 onNavigateToShift?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToPos, onNavigateToShift }) => {
 const [selectedBranch, setSelectedBranch] = useState('Consolidado Global');
 const [timeRange, setTimeRange] = useState('30d');
 const [chartType, setChartType] = useState<'line' | 'bar'>('line');
 const [chartMetric, setChartMetric] = useState<'amount' | 'tickets'>('amount');
 const [isOnline, setIsOnline] = useState(true);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Mock 30 days data
 const salesTrendData = Array.from({ length: 30 }, (_, i) => ({
 day: i + 1,
 date: `2026-08-${String(i + 1).padStart(2, '0')}`,
 amount: Math.floor(Math.random() * 400) + 400,
 tickets: Math.floor(Math.random() * 10) + 5,
 avgTicket: 86.40,
  }));

 const handleRefresh = () => {
 setIsRefreshing(true);
 setTimeout(() => setIsRefreshing(false), 600);
  };

 const criticalStockItems = [
    { sku: 'AB-QSO-002', name: 'Queso Criollo (a granel)', stock: '1.25 kg', min_stock: '5.00 kg' },
    { sku: 'AB-LAC-006', name: 'Leche Entera 1 Litro (Caja)', stock: '3 u.', min_stock: '10 u.' },
    { sku: 'EL-AUD-012', name: 'Auriculares Bluetooth Pro', stock: '1 u.', min_stock: '4 u.' },
    { sku: 'AB-ARZ-001', name: 'Arroz Extra (Bolsa 5kg)', stock: '2 u.', min_stock: '8 u.' },
    { sku: 'EL-CAB-005', name: 'Cables USB-C Carga Rápida 2m', stock: '0 u.', min_stock: '5 u.' },
  ];

 const recentSales = [
    { ticket: 'TK-10024', time: '14:22:10', cashier: 'Juan Pérez', method: 'Efectivo', total: '$145.80', icon: <Banknote className="w-4 h-4 text-emerald-500" /> },
    { ticket: 'TK-10023', time: '14:10:05', cashier: 'Juan Pérez', method: 'Tarjeta', total: '$320.00', icon: <CreditCard className="w-4 h-4 text-blue-500" /> },
    { ticket: 'TK-10022', time: '13:45:50', cashier: 'María Gómez', method: 'QR', total: '$85.50', icon: <QrCode className="w-4 h-4 text-purple-500" /> },
    { ticket: 'TK-10021', time: '13:12:18', cashier: 'Juan Pérez', method: 'Efectivo', total: '$42.30', icon: <Banknote className="w-4 h-4 text-emerald-500" /> },
    { ticket: 'TK-10020', time: '12:50:00', cashier: 'María Gómez', method: 'Tarjeta', total: '$270.40', icon: <CreditCard className="w-4 h-4 text-blue-500" /> },
  ];

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header & Welcome Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            Bienvenido Administrador, 👋
          </h1>
          <p className="text-body text-ink-2 mt-1 flex items-center gap-3">
            <span>📅 viernes, 14 de agosto de 2026</span>
            <span>•</span>
            <span className="font-semibold text-accent">Turno en curso: Mañana #1</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-ink-2">
              <Store className="w-3.5 h-3.5 text-blue-500" /> Sucursal Central
            </span>
          </p>
        </div>

        {/* Quick Controls & Date Filter Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Selector */}
          <select 
 value={selectedBranch}
 onChange={(e) => setSelectedBranch(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:border-accent"
          >
            <option value="Consolidado Global">Consolidado Global</option>
            <option value="Sucursal Centro">Sucursal Centro</option>
            <option value="Sucursal Norte">Sucursal Norte</option>
          </select>

          {/* Time Range Selector */}
          <select 
 value={timeRange}
 onChange={(e) => setTimeRange(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:border-accent"
          >
            <option value="30d">Últimos 30 días</option>
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="month">Mes actual</option>
          </select>

          {/* Interactive Date Filter Button */}
          <button 
 className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow-e1 transition-all"
 title="Filtrar por fecha"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Filtrar por fecha</span>
          </button>

          {/* Sync Status Badge */}
          <button 
 onClick={() => setIsOnline(!isOnline)}
 className={`px-3 py-2 rounded-md text-body font-bold flex items-center gap-2 border transition-all ${
 isOnline 
                ? 'bg-ok-soft text-ok border-emerald-200 dark:border-emerald-800' 
 : 'bg-warn-soft text-warn border-amber-200 dark:border-amber-800'
            }`}
 title="Alternar estado de sincronización simulación"
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
            {isOnline ? 'Conectado' : 'Modo Local (Offline)'}
          </button>

          {/* Refresh Button */}
          <button 
 onClick={handleRefresh}
 className="p-2 bg-accent-soft text-accent rounded-md border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all"
 title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Offline Mode Banner */}
      {!isOnline && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-warn text-body font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Operando en modo local (Offline). Las métricas reflejan exclusivamente la actividad almacenada localmente en SQLite hasta la próxima sincronización.
          </span>
        </div>
      )}

      {/* 2. Top Metric Cards Grid (8 KPIs Financieros en 2 Filas) */}
      <div className="space-y-4">
        {/* Fila 1: KPIs Principales de Ventas y Utilidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ventas Totales */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Ventas totales</span>
              <div className="p-2.5 bg-accent-soft rounded-md text-blue-500">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$864.00</span>
            </div>
            <div className="flex items-center gap-1 text-body font-bold text-ok">
              <ArrowUpRight className="w-4 h-4" />
              <span>+14.2% respecto al periodo anterior</span>
            </div>
          </div>

          {/* Card 2: Margen Neto */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-body font-bold text-ink-2 uppercase tracking-wider">
                <span>Neto</span>
                <div className="group relative cursor-pointer">
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-micro rounded-md shadow-e2 z-20">
                    Ganancia bruta menos el Costo Promedio Ponderado (CPP) de la mercadería vendida.
                  </div>
                </div>
              </div>
              <div className="p-2.5 bg-ok-soft rounded-md text-emerald-500">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$864.00</span>
            </div>
            <div className="flex items-center gap-1 text-body font-bold text-ok">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>32.3% de margen de rentabilidad</span>
            </div>
          </div>

          {/* Card 3: Facturas Vencidas */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Facturas vencidas</span>
              <div className="p-2.5 bg-danger-soft rounded-md text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$0.00</span>
            </div>
            <div className="text-body font-semibold text-danger">
              0 facturas pendientes de cobro/pago
            </div>
          </div>

          {/* Card 4: Retorno Total de Compras */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Retorno de compras</span>
              <div className="p-2.5 bg-accent-soft rounded-md text-purple-500">
                <Download className="w-5 h-5 rotate-180" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$0.00</span>
            </div>
            <div className="text-body font-semibold text-ink-2">
              Notas de crédito de proveedores
            </div>
          </div>
        </div>

        {/* Fila 2: KPIs Secundarios de Compras, Devoluciones y Gastos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 5: Compra Total */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Compra total</span>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-md text-indigo-500">
                <Download className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$0.00</span>
            </div>
            <div className="text-body font-semibold text-ink-2">
              0 órdenes de compra procesadas
            </div>
          </div>

          {/* Card 6: Compra Pendiente */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Compra pendiente</span>
              <div className="p-2.5 bg-warn-soft rounded-md text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$0.00</span>
            </div>
            <div className="text-body font-semibold text-warn">
              0 pedidos pendientes por recibir
            </div>
          </div>

          {/* Card 7: Registro de Devoluciones Totales */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Devoluciones totales</span>
              <div className="p-2.5 bg-danger-soft rounded-md text-danger">
                <ShoppingCart className="w-5 h-5 rotate-180" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$0.00</span>
            </div>
            <div className="text-body font-semibold text-ink-2">
              Devoluciones de clientes en mostrador
            </div>
          </div>

          {/* Card 8: Control Acumulado de Gastos Operativos */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body font-bold text-ink-2 uppercase tracking-wider">Gastos operativos</span>
              <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/50 rounded-md text-cyan-500">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-display font-black font-mono text-ink">$0.00</span>
            </div>
            <div className="text-body font-semibold text-cyan-600 dark:text-cyan-400">
              Egresos acumulados de caja chica
            </div>
          </div>
        </div>
      </div>

      {/* 3. Central Module: Sales Trend Chart (30 Days) */}
      <div className="p-6 bg-raised border border-line rounded-md shadow-e1 space-y-5">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="font-extrabold text-base text-ink">Ventas de los últimos 30 días</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-sunken p-1 rounded-md border border-line">
              <button 
 onClick={() => setChartType('line')}
 className={`p-1.5 rounded-md text-body font-bold transition-all ${chartType === 'line' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'}`}
 title="Vista de Línea con área"
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
              <button 
 onClick={() => setChartType('bar')}
 className={`p-1.5 rounded-md text-body font-bold transition-all ${chartType === 'bar' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'}`}
 title="Vista de Barras verticales"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center bg-sunken p-1 rounded-md border border-line">
              <button 
 onClick={() => setChartMetric('amount')}
 className={`px-3 py-1 rounded-md text-body font-bold transition-all ${chartMetric === 'amount' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'}`}
              >
                Monto ($)
              </button>
              <button 
 onClick={() => setChartMetric('tickets')}
 className={`px-3 py-1 rounded-md text-body font-bold transition-all ${chartMetric === 'tickets' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'}`}
              >
                Tickets
              </button>
            </div>
          </div>
        </div>

        {/* Visual Chart Area */}
        <div className="relative h-64 w-full pt-4">
          {/* Y Axis Guide Lines */}
          <div className="absolute inset-0 flex flex-col justify-between text-micro font-mono text-gray-400 pointer-events-none pb-6">
            <div className="border-b border-line/50 w-full flex justify-between"><span>10k</span></div>
            <div className="border-b border-line/50 w-full flex justify-between"><span>7.5k</span></div>
            <div className="border-b border-line/50 w-full flex justify-between"><span>5k</span></div>
            <div className="border-b border-line/50 w-full flex justify-between"><span>2.5k</span></div>
            <div className="w-full flex justify-between"><span>0k</span></div>
          </div>

          {/* Interactive Trend Bar/Line Rendering */}
          <div className="relative h-48 w-full flex items-end justify-between gap-1 pt-4 z-10">
            {salesTrendData.map((d, i) => {
 const val = chartMetric === 'amount' ? d.amount : d.tickets * 80;
 const maxVal = 800;
 const heightPct = Math.min(100, Math.max(10, (val / maxVal) * 100));

 return (
                <div 
 key={i} 
 className="flex-1 flex flex-col items-center group relative h-full justify-end"
 onMouseEnter={() => setHoveredDay(i)}
 onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Tooltip Hover Box */}
                  {hoveredDay === i && (
                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-body p-2.5 rounded-md shadow-e2 z-30 w-44 pointer-events-none border border-gray-700">
                      <p className="font-bold border-b border-gray-700 pb-1 text-blue-400">{d.date}</p>
                      <div className="mt-1 space-y-0.5 text-micro font-mono">
                        <p className="flex justify-between"><span>Facturado:</span> <span className="font-bold text-white">${d.amount}.00</span></p>
                        <p className="flex justify-between"><span>Ventas:</span> <span>{d.tickets} tickets</span></p>
                        <p className="flex justify-between"><span>Promedio:</span> <span>${d.avgTicket.toFixed(2)}</span></p>
                      </div>
                    </div>
                  )}

                  {/* Render Chart Representation */}
                  {chartType === 'bar' ? (
                    <div 
 style={{ height: `${heightPct}%` }}
 className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-400 rounded-t transition-colors duration-fast ease-ease"
                    />
                  ) : (
                    <div className="w-full flex flex-col items-center justify-end h-full">
                      <div 
 style={{ height: `${heightPct}%` }}
 className="w-2 bg-gradient-to-t from-blue-500/20 to-blue-500 rounded-t group-hover:bg-blue-400 transition-colors duration-fast ease-ease relative"
                      >
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute top-0 -left-0.25 shadow" />
                      </div>
                    </div>
                  )}

                  {/* X Axis Label */}
                  <span className="text-micro font-mono text-gray-400 mt-2">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Support Panels & Operational Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Block A: Critical Stock Alert */}
        <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-ink">Alerta de Stock Crítico</h3>
            </div>
            <span className="text-micro font-bold px-2 py-0.5 bg-warn-soft text-warn rounded-full border border-amber-200">
              5 Ítems
            </span>
          </div>

          <div className="space-y-2">
            {criticalStockItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-sunken rounded-md flex items-center justify-between border border-line text-body">
                <div>
                  <p className="font-bold text-ink leading-tight">{item.name}</p>
                  <span className="text-micro text-gray-400 font-mono">SKU: {item.sku}</span>
                </div>
                <div className="text-right space-y-1">
                  <span className="block font-mono font-bold text-red-500">{item.stock}</span>
                  <button className="px-2 py-0.5 bg-blue-600 text-white rounded text-micro font-bold hover:bg-blue-700 transition-colors">
                    Generar OC
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block B: Live Shift Sales Feed */}
        <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2 text-emerald-500">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-base text-ink">Últimas Ventas del Turno</h3>
            </div>
            <span className="text-micro font-bold px-2 py-0.5 bg-ok-soft text-ok rounded-full border border-emerald-200">
              En Vivo
            </span>
          </div>

          <div className="space-y-2">
            {recentSales.map((sale, idx) => (
              <div key={idx} className="p-3 bg-sunken rounded-md flex items-center justify-between border border-line text-body">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-raised rounded-md border border-line">
                    {sale.icon}
                  </div>
                  <div>
                    <p className="font-bold font-mono text-ink">{sale.ticket}</p>
                    <span className="text-micro text-gray-400">{sale.time} • {sale.cashier}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-mono font-bold text-ink">{sale.total}</span>
                  <span className="text-micro text-gray-500 font-semibold">{sale.method}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-line text-center">
            <button className="text-body font-bold text-accent hover:underline">
              Ver historial completo de ventas →
            </button>
          </div>
        </div>

        {/* Block C: Quick Action Buttons */}
        <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-bold text-base text-ink">Accesos Directos</h3>
            <span className="text-body text-gray-400">Operaciones frecuentes</span>
          </div>

          <div className="space-y-3">
            {/* Direct Action 1: Open POS Terminal */}
            <button 
 onClick={onNavigateToPos}
 className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-md shadow-e1 flex items-center justify-between group transition-all"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5" />
                <span>Abrir Terminal POS (Caja)</span>
              </span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Direct Action 2: Petty Cash Expense */}
            <button 
 onClick={onNavigateToShift}
 className="w-full p-3 bg-sunken hover:bg-sunken text-ink font-bold text-body rounded-md border border-line flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span>Registrar Gasto de Caja Chica</span>
              </span>
              <span>→</span>
            </button>

            {/* Direct Action 3: Shift Closing Audit */}
            <button 
 onClick={onNavigateToShift}
 className="w-full p-3 bg-sunken hover:bg-sunken text-ink font-bold text-body rounded-md border border-line flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>Realizar Conteo / Arqueo de Caja</span>
              </span>
              <span>→</span>
            </button>

            {/* Direct Action 4: Quick New Product */}
            <button className="w-full p-3 bg-sunken hover:bg-sunken text-ink font-bold text-body rounded-md border border-line flex items-center justify-between transition-all">
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-500" />
                <span>Nuevo Producto Rápido</span>
              </span>
              <span>+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


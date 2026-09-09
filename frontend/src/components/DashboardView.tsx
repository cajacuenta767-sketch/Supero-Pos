import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  CreditCard,
  LineChart as LineChartIcon,
  Package,
  QrCode,
  RefreshCw,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Money,
  Select,
  Skeleton,
  StatTile,
  cn,
} from '../ui';
import type { Column } from '../ui';

/* Datos de demostración deterministas: un generador congruencial con semilla
 fija. Con Math.random la serie se regeneraba en cada render y el gráfico
 cambiaba solo al pasar el ratón. */
const seeded = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

interface TrendPoint {
  day: number;
  date: string;
  amount: number;
  tickets: number;
}

const CRITICAL_STOCK = [
  { sku: 'EL-CAB-005', name: 'Cables USB-C Carga Rápida 2m', stock: 0, min: 5, unit: 'u.' },
  { sku: 'EL-AUD-012', name: 'Auriculares Bluetooth Pro', stock: 1, min: 4, unit: 'u.' },
  { sku: 'AB-QSO-002', name: 'Queso Criollo (a granel)', stock: 1.25, min: 5, unit: 'kg' },
  { sku: 'AB-ARZ-001', name: 'Arroz Extra (Bolsa 5 kg)', stock: 2, min: 8, unit: 'u.' },
  { sku: 'AB-LAC-006', name: 'Leche Entera 1 Litro (Caja)', stock: 3, min: 10, unit: 'u.' },
];

const RECENT_SALES = [
  { ticket: 'TK-10024', time: '14:22', cashier: 'Juan Pérez', method: 'Efectivo', total: 145.8 },
  { ticket: 'TK-10023', time: '14:10', cashier: 'Juan Pérez', method: 'Tarjeta', total: 320.0 },
  { ticket: 'TK-10022', time: '13:45', cashier: 'María Gómez', method: 'QR', total: 85.5 },
  { ticket: 'TK-10021', time: '13:12', cashier: 'Juan Pérez', method: 'Efectivo', total: 42.3 },
  { ticket: 'TK-10020', time: '12:50', cashier: 'María Gómez', method: 'Tarjeta', total: 270.4 },
];

const METHOD_ICON: Record<string, React.ReactNode> = {
  Efectivo: <Banknote className="w-3.5 h-3.5" />,
  Tarjeta: <CreditCard className="w-3.5 h-3.5" />,
  QR: <QrCode className="w-3.5 h-3.5" />,
};

/* ── Gráfico de tendencia ────────────────────────────────────────────────
   Una sola serie: el título la nombra, no hace falta leyenda. Un solo eje.
   Marcas finas, rejilla recesiva, capa de hover con línea guía y tooltip,
 y etiqueta directa solo en el máximo.
   Nota de color: la serie usa --accent, que pasa los seis chequeos en ambos
 temas. --ok y --warn quedan fuera de la banda de luminosidad sobre fondo
 oscuro: sirven como estado, no como marca de gráfico.                  */
const TrendChart: React.FC<{
  data: TrendPoint[];
  metric: 'amount' | 'tickets';
  kind: 'line' | 'bar';
}> = ({ data, metric, kind }) => {
  const [hover, setHover] = useState<number | null>(null);
  /* El viewBox escala, pero los rótulos del eje no: bajo 1024px se amontonan,
     así que se muestra uno cada 10 días en lugar de cada 5. */
  const [tickEvery, setTickEvery] = useState(5);
  useEffect(() => {
    const apply = () => setTickEvery(window.innerWidth < 1024 ? 10 : 5);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const W = 1000;
  const H = 260;
  const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d[metric]);
  const max = Math.max(...values);
  const niceMax = Math.ceil(max / 100) * 100 || 1;
  const peakIndex = values.indexOf(max);

  const x = (i: number) => PAD.left + (i / Math.max(1, data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / niceMax) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[metric])}`).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;
  const barW = Math.max(4, (plotW / data.length) * 0.55);

  const active = hover !== null ? data[hover] : null;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[260px] overflow-visible"
        role="img"
        aria-label={`Tendencia de ${metric === 'amount' ? 'ventas' : 'tickets'} de los últimos 30 días`}
        onMouseLeave={() => setHover(null)}
      >
        {/* Rejilla recesiva */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-3 text-[11px] font-mono"
            >
              {metric === 'amount' ? `${t / 1000 >= 1 ? `${t / 1000}k` : t}` : t}
            </text>
          </g>
        ))}

        {kind === 'line' ? (
          <>
            <path d={areaPath} className="fill-accent/10" />
            <path
              d={linePath}
              className="stroke-accent"
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : (
          data.map((d, i) => (
            <rect
              key={d.day}
              x={x(i) - barW / 2}
              y={y(d[metric])}
              width={barW}
              height={Math.max(2, PAD.top + plotH - y(d[metric]))}
              rx={4}
              className={cn(
                'fill-accent transition-opacity duration-fast',
                hover !== null && hover !== i && 'opacity-40',
              )}
            />
          ))
        )}

        {/* Etiqueta directa: solo el máximo, nunca un número por punto */}
        <text
          x={x(peakIndex)}
          y={y(max) - 12}
          textAnchor="middle"
          className="fill-ink text-[11px] font-mono font-semibold"
        >
          {metric === 'amount' ? `$${max}` : max}
        </text>

        {/* Eje X: un rótulo cada cinco días */}
        {data.map((d, i) =>
          i % tickEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.day}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-ink-3 text-[11px] font-mono"
            >
              {d.day}
            </text>
          ) : null,
        )}

        {/* Capa de hover: línea guía + marcador, con zonas de impacto anchas */}
        {active && (
          <>
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              className="stroke-line-strong"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover!)}
              cy={y(active[metric])}
              r={5}
              className="fill-accent stroke-surface"
              strokeWidth={2}
            />
          </>
        )}
        {data.map((d, i) => (
          <rect
            key={`hit-${d.day}`}
            x={x(i) - plotW / data.length / 2}
            y={PAD.top}
            width={plotW / data.length}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      <figcaption
        className={cn(
          'mt-2 h-9 flex items-center gap-3 px-3 rounded-md border text-body',
          active ? 'bg-sunken border-line' : 'border-transparent',
        )}
      >
        {active ? (
          <>
            <span className="font-mono text-ink-2">{active.date}</span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-2">Ventas</span>
            <Money value={active.amount} size="body" className="text-ink font-semibold" />
            <span className="text-ink-3">·</span>
            <span className="text-ink-2">Tickets</span>
            <span className="font-mono tnum text-ink font-semibold">{active.tickets}</span>
          </>
        ) : (
          <span className="text-ink-3">
            Pase el cursor sobre el gráfico para ver el detalle diario.
          </span>
        )}
      </figcaption>
    </figure>
  );
};

export const DashboardView: React.FC = () => {
  const [branch, setBranch] = useState('Consolidado Global');
  const [range, setRange] = useState('30d');
  const [metric, setMetric] = useState<'amount' | 'tickets'>('amount');
  const [kind, setKind] = useState<'line' | 'bar'>('line');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const trend = useMemo<TrendPoint[]>(() => {
    const rnd = seeded(20260814);
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      amount: Math.floor(rnd() * 400) + 400,
      tickets: Math.floor(rnd() * 10) + 5,
    }));
  }, []);

  const refresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 600);
  };

  const stockColumns: Array<Column<(typeof CRITICAL_STOCK)[number]>> = [
    {
      key: 'product',
      header: 'Producto',
      render: (r) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{r.name}</p>
          <p className="font-mono text-micro text-ink-3">{r.sku}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Existencia',
      align: 'right',
      width: '150px',
      render: (r) => (
        <Badge
          tone={r.stock === 0 ? 'danger' : 'warning'}
          icon={<AlertTriangle className="w-3 h-3" />}
        >
          {r.stock} {r.unit}
        </Badge>
      ),
    },
    {
      key: 'min',
      header: 'Mínimo',
      align: 'right',
      width: '90px',
      render: (r) => (
        <span className="font-mono tnum text-ink-2">
          {r.min} {r.unit}
        </span>
      ),
    },
  ];

  const salesColumns: Array<Column<(typeof RECENT_SALES)[number]>> = [
    {
      key: 'ticket',
      header: 'Ticket',
      width: '110px',
      render: (r) => <span className="font-mono text-body text-ink">{r.ticket}</span>,
    },
    {
      key: 'time',
      header: 'Hora',
      width: '70px',
      render: (r) => <span className="font-mono tnum text-ink-2">{r.time}</span>,
    },
    {
      key: 'cashier',
      header: 'Cajero',
      render: (r) => <span className="text-ink-2 truncate">{r.cashier}</span>,
    },
    {
      key: 'method',
      header: 'Método',
      width: '120px',
      render: (r) => <Badge icon={METHOD_ICON[r.method]}>{r.method}</Badge>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: '110px',
      render: (r) => <Money value={r.total} size="base" className="text-ink" />,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        {/* Encabezado */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-ink">Resumen de operación</h1>
            <p className="text-base text-ink-2 mt-1">
              viernes, 14 de agosto de 2026 · Turno Mañana #1 · Sucursal Central
            </p>
          </div>

          {/* Los filtros van en una sola fila sobre los gráficos */}
          <div className="flex items-center gap-2">
            <Select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              aria-label="Sucursal"
            >
              <option>Consolidado Global</option>
              <option>Sucursal Centro</option>
              <option>Sucursal Norte</option>
            </Select>
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              aria-label="Rango de fechas"
            >
              <option value="today">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="month">Mes actual</option>
            </Select>
            <Button variant="secondary" icon={<Calendar className="w-3.5 h-3.5" />}>
              Fechas
            </Button>
            <Button
              variant="ghost"
              icon={<RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />}
              onClick={refresh}
              aria-label="Actualizar"
            >
              Actualizar
            </Button>
          </div>
        </header>

        {/* Indicadores */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatTile
            label="Ventas del periodo"
            value={<Money value={25_940.5} size="display" />}
            delta={14.2}
            hint="vs. periodo anterior"
            icon={<ShoppingCart className="w-4 h-4" />}
            tone="accent"
          />
          <StatTile
            label="Margen neto"
            value={<Money value={8_378.4} size="display" />}
            delta={3.1}
            hint="32.3% de rentabilidad"
            icon={<Wallet className="w-4 h-4" />}
            tone="success"
          />
          <StatTile
            label="Ticket promedio"
            value={<Money value={86.4} size="display" />}
            delta={-1.8}
            hint="300 tickets emitidos"
            icon={<ArrowUpRight className="w-4 h-4" />}
          />
          <StatTile
            label="Stock crítico"
            value={CRITICAL_STOCK.length}
            hint="productos bajo mínimo"
            icon={<Package className="w-4 h-4" />}
            tone="warning"
          />
        </div>

        {/* Tendencia */}
        <Card
          title="Ventas de los últimos 30 días"
          icon={<LineChartIcon className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-line overflow-hidden">
                {(['amount', 'tickets'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={cn(
                      'h-8 px-3 text-body font-semibold transition-colors duration-fast ease-ease',
                      metric === m
                        ? 'bg-accent-soft text-accent-ink'
                        : 'bg-raised text-ink-2 hover:text-ink',
                    )}
                  >
                    {m === 'amount' ? 'Monto' : 'Tickets'}
                  </button>
                ))}
              </div>
              <div className="flex rounded-md border border-line overflow-hidden">
                {(['line', 'bar'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    aria-label={k === 'line' ? 'Ver como línea' : 'Ver como barras'}
                    className={cn(
                      'h-8 w-9 flex items-center justify-center transition-colors duration-fast ease-ease',
                      kind === k
                        ? 'bg-accent-soft text-accent-ink'
                        : 'bg-raised text-ink-2 hover:text-ink',
                    )}
                  >
                    {k === 'line' ? (
                      <LineChartIcon className="w-4 h-4" />
                    ) : (
                      <BarChart3 className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          {isRefreshing ? (
            <div className="space-y-3">
              <Skeleton variant="tile" className="h-[260px]" />
              <Skeleton variant="text" className="h-9" />
            </div>
          ) : (
            <TrendChart data={trend} metric={metric} kind={kind} />
          )}
        </Card>

        {/* Atención inmediata */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card
            title="Stock bajo mínimo"
            subtitle="Ordenado por urgencia"
            icon={<AlertTriangle className="w-4 h-4" />}
            padding="none"
          >
            <DataTable
              columns={stockColumns}
              rows={CRITICAL_STOCK}
              rowKey={(r) => r.sku}
              dense
              className="border-0 rounded-none"
              empty={<EmptyState icon={<Package className="w-6 h-6" />} title="Sin faltantes" />}
            />
          </Card>

          <Card
            title="Últimas ventas"
            subtitle="Turno en curso"
            icon={<ShoppingCart className="w-4 h-4" />}
            padding="none"
          >
            <DataTable
              columns={salesColumns}
              rows={RECENT_SALES}
              rowKey={(r) => r.ticket}
              dense
              className="border-0 rounded-none"
              empty={
                <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="Sin ventas aún" />
              }
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

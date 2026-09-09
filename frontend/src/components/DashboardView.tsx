import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  LineChart as LineChartIcon,
  Package,
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
import { useCatalogStore, MOVEMENT_LABEL } from '../store/useCatalogStore';
import { useSalesStore } from '../store/useSalesStore';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore, DEMO_BRANCHES } from '../store/useAuthStore';
import { formatDate, formatTime } from '../utils/dates';
import { CURRENCIES, useSettingsStore } from '../store/useSettingsStore';

interface TrendPoint {
  day: number;
  date: string;
  amount: number;
  tickets: number;
}

/* ── Gráfico de tendencia ────────────────────────────────────────────────
   Una sola serie: el título la nombra, no hace falta leyenda. Un solo eje.
   Marcas finas, rejilla recesiva, capa de hover con línea guía y tooltip,
 y etiqueta directa solo en el máximo.
   Nota de color: la serie usa --accent, que pasa los seis chequeos en ambos
 temas. --ok y --warn quedan fuera de la banda de luminosidad sobre fondo
 oscuro: sirven como estado, no como marca de gráfico.                  */
const TrendChart: React.FC<{
  rangeLabel: string;
  data: TrendPoint[];
  metric: 'amount' | 'tickets';
  kind: 'line' | 'bar';
}> = ({ rangeLabel, data, metric, kind }) => {
  const currencySymbol = useSettingsStore(
    (state) => CURRENCIES[state.currency] ?? CURRENCIES.BOB,
  ).symbol;
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
  const max = Math.max(0, ...values);
  /* Techo redondo proporcional a la magnitud del dato. Antes se redondeaba
     siempre a centenas: servía para importes, pero el eje de tickets —donde el
     máximo son tres o cuatro— quedaba de 0 a 100 con la serie pegada al suelo.
     Y con un máximo por debajo de 100 las cinco marcas del eje se repetían,
     que era el aviso de claves duplicadas de React. */
  const niceMax = (() => {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = [1, 2, 2.5, 5, 10].find((m) => max <= magnitude * m * 4) ?? 10;
    return Math.ceil(max / (magnitude * step)) * magnitude * step;
  })();
  const peakIndex = values.indexOf(max);

  const x = (i: number) => PAD.left + (i / Math.max(1, data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / niceMax) * plotH;

  /* Cuatro tramos siempre; el valor puede repetirse con máximos pequeños, así
     que la clave es la posición, no la cifra. */
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => niceMax * t);
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
        aria-label={`Tendencia de ${metric === 'amount' ? 'ventas' : 'tickets'} · ${rangeLabel}`}
        onMouseLeave={() => setHover(null)}
      >
        {/* Rejilla recesiva */}
        {ticks.map((t, i) => (
          <g key={i}>
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
              {metric === 'amount'
                ? t >= 1000
                  ? `${Number((t / 1000).toFixed(1))}k`
                  : Number(t.toFixed(2))
                : Number(t.toFixed(1))}
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
          {/* El símbolo sale de los ajustes: la marca del máximo escribía «$»
              mientras el resto del panel decía «Bs.». */}
          {metric === 'amount' ? `${currencySymbol}${Number(max.toFixed(2))}` : max}
        </text>

        {/* Eje X: un rótulo cada cinco días */}
        {data.map((d, i) =>
          i % tickEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-ink-3 text-[11px] font-mono"
            >
              {/* El día del mes que corresponde, no un contador de 1 a 30: con
                  la serie inventada daba igual, con fechas reales no. */}
              {Number(d.date.slice(8, 10))}
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
            <span className="font-mono text-ink-2">{formatDate(active.date)}</span>
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
  const [branch, setBranch] = useState('ALL');
  const [range, setRange] = useState('30d');
  const [metric, setMetric] = useState<'amount' | 'tickets'>('amount');
  const [kind, setKind] = useState<'line' | 'bar'>('line');
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* El stock crítico sale del catálogo, no de una lista fija que hablaba de
     productos inexistentes —«Cables USB-C», «Arroz Extra»— mientras ignoraba los
     que sí estaban por debajo del mínimo. */
  const products = useCatalogStore((state) => state.products);
  const movements = useCatalogStore((state) => state.movements);

  const criticalStock = useMemo(
    () =>
      products
        .filter((p) => p.is_active && p.stock <= p.min_stock)
        .sort((a, b) => a.stock - b.stock)
        .map((p) => ({
          sku: p.sku,
          name: p.name,
          stock: p.stock,
          min: p.min_stock,
          unit: p.unit_type === 'FRACTION' ? 'kg' : 'u.',
        })),
    [products],
  );

  /* Movimientos reales de inventario en lugar de una lista inventada: es lo que
     de verdad ha pasado en esta terminal. */
  const recentMovements = useMemo(() => movements.slice(0, 6), [movements]);

  /* Las cifras salen de las ventas cobradas en esta terminal. Antes el panel
     anunciaba Bs 25.940,50 de ventas, Bs 8.378,40 de margen y un ticket medio
     de Bs 86,40 escritos a mano, y la serie del gráfico la generaba un
     pseudoaleatorio con semilla fija: treinta días de facturación inventada
     sobre los que nadie podía decidir nada. */
  const tickets = useSalesStore((state) => state.tickets);

  /** Días que abarca el periodo elegido, incluido hoy. */
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === 'month' ? 31 : 30;

  const startOfPeriod = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    if (range === 'month') from.setDate(1);
    else from.setTime(from.getTime() - (days - 1) * 86_400_000);
    return from;
  }, [range, days]);

  const periodTickets = useMemo(
    () =>
      tickets.filter((t) => {
        if (t.status !== 'COMPLETED') return false;
        if (branch !== 'ALL' && t.branch_id !== branch) return false;
        const at = new Date(t.at).getTime();
        return !Number.isNaN(at) && at >= startOfPeriod.getTime();
      }),
    [tickets, branch, startOfPeriod],
  );

  const revenue = periodTickets.reduce((sum, t) => sum + t.total, 0);
  const avgTicket = periodTickets.length > 0 ? revenue / periodTickets.length : 0;

  /* Margen real: lo cobrado menos lo que costó, línea a línea, con el coste que
     tiene hoy el producto en el catálogo. */
  const margin = useMemo(
    () =>
      periodTickets.reduce(
        (sum, t) =>
          sum +
          t.items.reduce((line, item) => {
            const cost = products.find((p) => p.id === item.id)?.cost_price ?? 0;
            return line + (item.unit_price - cost) * item.quantity;
          }, 0),
        0,
      ),
    [periodTickets, products],
  );

  /* Comparación con el periodo anterior de la misma duración. Los deltas
     estaban escritos a mano (+14,2 % · +3,1 % · −1,8 %) y no se movían
     aunque no hubiera una sola venta. */
  const previousTickets = useMemo(() => {
    const end = startOfPeriod.getTime();
    const start = end - days * 86_400_000;
    return tickets.filter((t) => {
      if (t.status !== 'COMPLETED') return false;
      if (branch !== 'ALL' && t.branch_id !== branch) return false;
      const at = new Date(t.at).getTime();
      return !Number.isNaN(at) && at >= start && at < end;
    });
  }, [tickets, branch, startOfPeriod, days]);

  /** Variación porcentual. Sin base con la que comparar no hay variación. */
  const delta = (now: number, before: number): number | undefined =>
    before === 0 ? undefined : Number((((now - before) / before) * 100).toFixed(1));

  const previousRevenue = previousTickets.reduce((sum, t) => sum + t.total, 0);
  const previousAvg = previousTickets.length > 0 ? previousRevenue / previousTickets.length : 0;
  const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

  /* La jornada que se está viendo, no una fecha escrita a mano: el panel decía
     «viernes, 14 de agosto de 2026 · Turno Mañana #1 · Sucursal Central» a
     cualquiera, cualquier día y en cualquier sucursal. */
  const cashShift = usePosStore((state) => state.cashShift);
  const user = useAuthStore((state) => state.user);

  const subtitle = [
    new Date().toLocaleDateString('es-BO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    cashShift
      ? `${cashShift.registerName} · turno abierto ${formatTime(cashShift.openedAt)}`
      : 'sin turno abierto',
    user?.branchName ?? 'Sucursal sin asignar',
  ].join(' · ');

  /* «Actualizar» solo giraba un icono 600 ms. Ahora relee lo guardado, que es
     lo único que puede haber cambiado por fuera: otra ventana de la misma caja
     cobrando o recibiendo mercancía. */
  const hydrateSales = useSalesStore((state) => state.hydrate);
  const hydrateCatalog = useCatalogStore((state) => state.hydrate);

  const refresh = () => {
    setIsRefreshing(true);
    hydrateSales();
    hydrateCatalog();
    window.setTimeout(() => setIsRefreshing(false), 400);
  };

  const rangeLabel =
    range === 'today'
      ? 'hoy'
      : range === '7d'
        ? 'últimos 7 días'
        : range === 'month'
          ? 'mes actual'
          : 'últimos 30 días';

  const trend = useMemo<TrendPoint[]>(() => {
    /* Un cubo por día del periodo: los días sin ventas valen cero y se ven,
       que es justo la información que interesa. */
    const buckets = Array.from({ length: days }, (_, i) => {
      const date = new Date(startOfPeriod.getTime() + i * 86_400_000);
      return { day: i + 1, date: date.toISOString().slice(0, 10), amount: 0, tickets: 0 };
    });
    const index = new Map(buckets.map((b) => [b.date, b]));

    for (const t of periodTickets) {
      const key = new Date(t.at).toISOString().slice(0, 10);
      const bucket = index.get(key);
      if (!bucket) continue;
      bucket.amount += t.total;
      bucket.tickets += 1;
    }
    return buckets;
  }, [periodTickets, startOfPeriod, days]);

  const movementColumns: Array<Column<(typeof recentMovements)[number]>> = [
    {
      key: 'product',
      header: 'Producto',
      card: 'title',
      render: (m) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{m.productName}</p>
          <p className="text-micro text-ink-3">{MOVEMENT_LABEL[m.type]}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      width: '120px',
      card: 'meta',
      render: (m) => (
        <span
          className={cn(
            'font-mono tnum text-base font-semibold',
            m.quantity < 0 ? 'text-danger' : 'text-ok',
          )}
        >
          {m.quantity > 0 ? '+' : ''}
          {m.quantity}
        </span>
      ),
    },
    {
      key: 'after',
      header: 'Queda',
      align: 'right',
      width: '100px',
      render: (m) => <span className="font-mono tnum text-body text-ink-2">{m.stockAfter}</span>,
    },
  ];

  const stockColumns: Array<Column<(typeof criticalStock)[number]>> = [
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

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        {/* Encabezado */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-ink">Resumen de operación</h1>
            <p className="text-base text-ink-2 mt-1">{subtitle}</p>
          </div>

          {/* Los filtros van en una sola fila sobre los gráficos */}
          <div className="flex items-center gap-2">
            <Select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              aria-label="Sucursal"
            >
              {/* Las sucursales que existen de verdad. Antes eran tres nombres
                  escritos aquí que no coincidían con ninguna lista del sistema
                  y que además no filtraban nada. */}
              <option value="ALL">Consolidado global</option>
              {DEMO_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
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
            value={<Money value={revenue} size="display" />}
            delta={delta(revenue, previousRevenue)}
            hint={
              previousRevenue > 0
                ? 'vs. el periodo anterior'
                : `${periodTickets.length} ${periodTickets.length === 1 ? 'venta cobrada' : 'ventas cobradas'}`
            }
            icon={<ShoppingCart className="w-4 h-4" />}
            tone="accent"
          />
          <StatTile
            label="Margen neto"
            value={<Money value={margin} size="display" />}
            hint={
              revenue > 0
                ? `${marginRate.toFixed(1)} % sobre lo facturado`
                : 'sin ventas en el periodo'
            }
            icon={<Wallet className="w-4 h-4" />}
            tone="success"
          />
          <StatTile
            label="Ticket promedio"
            value={<Money value={avgTicket} size="display" />}
            delta={delta(avgTicket, previousAvg)}
            hint={`${periodTickets.length} ${periodTickets.length === 1 ? 'ticket emitido' : 'tickets emitidos'}`}
            icon={<ArrowUpRight className="w-4 h-4" />}
          />
          <StatTile
            label="Stock crítico"
            value={criticalStock.length}
            hint="productos bajo mínimo"
            icon={<Package className="w-4 h-4" />}
            tone="warning"
          />
        </div>

        {/* Tendencia */}
        <Card
          title={`Ventas · ${rangeLabel}`}
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
            <TrendChart rangeLabel={rangeLabel} data={trend} metric={metric} kind={kind} />
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
              caption="Productos por debajo de su stock mínimo"
              columns={stockColumns}
              rows={criticalStock}
              rowKey={(r) => r.sku}
              dense
              className="border-0 rounded-none"
              empty={<EmptyState icon={<Package className="w-6 h-6" />} title="Sin faltantes" />}
            />
          </Card>

          <Card
            title="Últimos movimientos"
            subtitle="Entradas y salidas de esta terminal"
            icon={<ShoppingCart className="w-4 h-4" />}
            padding="none"
          >
            {/* Movimientos reales del kardex. Antes era una lista de ventas
                inventada que no cambiaba por mucho que se vendiera. */}
            <DataTable
              caption="Últimos movimientos de inventario registrados en la terminal"
              columns={movementColumns}
              rows={recentMovements}
              rowKey={(m) => m.id}
              dense
              className="border-0 rounded-none"
              empty={
                <EmptyState
                  icon={<ShoppingCart className="w-6 h-6" />}
                  title="Sin movimientos aún"
                  hint="Las ventas, recepciones y ajustes aparecen aquí."
                />
              }
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

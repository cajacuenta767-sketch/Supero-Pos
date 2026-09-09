import { usePersistentState } from '../store/persist';
import React, { useMemo, useState } from 'react';
import { Award, Calendar, Clock, FileText, Lock, Plus, UserCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Meter,
  Modal,
  PageHeader,
  Select,
  StatTile,
  Tabs,
  Textarea,
  Toolbar,
  useToast,
} from '../ui';
import { formatDateTime } from '../utils/dates';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column, TabItem } from '../ui';

interface AttendanceLog {
  id: string;
  timestamp: string;
  employee_name: string;
  role: string;
  event_type: 'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT';
  terminal: string;
  status: 'ON_TIME' | 'LATE' | 'OVERTIME' | 'JUSTIFIED';
  lateness_minutes: number;
  hours_worked?: number;
}

interface ShiftSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_mins: number;
  assigned_employees: string[];
}

interface ExceptionRecord {
  id: string;
  employee_name: string;
  type: 'PERMISO_GOCE' | 'LICENCIA_MEDICA' | 'VACACIONES' | 'FALTA_JUSTIFICADA';
  date_range: string;
  notes: string;
  status: 'APPROVED' | 'PENDING';
}

type SubTab = 'timeclock' | 'shifts' | 'exceptions';

const TABS: TabItem[] = [
  { id: 'timeclock', label: 'Fichajes', icon: <Clock className="w-4 h-4" /> },
  { id: 'shifts', label: 'Turnos', icon: <Calendar className="w-4 h-4" /> },
  { id: 'exceptions', label: 'Incidencias', icon: <FileText className="w-4 h-4" /> },
];

/* Vocabulario de producto: los enums no se muestran crudos. */
const EVENT_LABEL: Record<AttendanceLog['event_type'], string> = {
  CLOCK_IN: 'Entrada',
  BREAK_START: 'Inicio de pausa',
  BREAK_END: 'Fin de pausa',
  CLOCK_OUT: 'Salida',
};

const STATUS_LABEL: Record<AttendanceLog['status'], string> = {
  ON_TIME: 'A tiempo',
  LATE: 'Retraso',
  OVERTIME: 'Horas extra',
  JUSTIFIED: 'Justificado',
};

const STATUS_TONE: Record<AttendanceLog['status'], 'success' | 'warning' | 'accent' | 'neutral'> = {
  ON_TIME: 'success',
  LATE: 'warning',
  OVERTIME: 'accent',
  JUSTIFIED: 'neutral',
};

const EXCEPTION_LABEL: Record<ExceptionRecord['type'], string> = {
  PERMISO_GOCE: 'Permiso con goce',
  LICENCIA_MEDICA: 'Licencia médica',
  VACACIONES: 'Vacaciones',
  FALTA_JUSTIFICADA: 'Falta justificada',
};

/** Jornada pactada, contra la que se compara lo trabajado. */
const SHIFT_HOURS = 8;

export const HrAttendanceView: React.FC = () => {
  const toast = useToast();

  /* F2 lleva el foco al buscador, «N» abre el alta. */
  useViewShortcuts({ onNew: () => setIsExceptionOpen(true) });
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('timeclock');

  const [clockPin, setClockPin] = useState('');
  const [clockEventType, setClockEventType] = useState<AttendanceLog['event_type']>('CLOCK_IN');
  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Attendance Logs State
  const [logs, setLogs] = usePersistentState<AttendanceLog[]>('fichajes', [
    {
      id: 'LOG-7001',
      timestamp: '14/08/2026 07:55',
      employee_name: 'Juan Pérez',
      role: 'CAJERO',
      event_type: 'CLOCK_IN',
      terminal: 'Caja 1 Principal',
      status: 'ON_TIME',
      lateness_minutes: 0,
      hours_worked: 8.0,
    },
    {
      id: 'LOG-7002',
      timestamp: '14/08/2026 08:14',
      employee_name: 'María Gómez',
      role: 'ALMACENERO',
      event_type: 'CLOCK_IN',
      terminal: 'Almacén Central',
      status: 'LATE',
      lateness_minutes: 14,
      hours_worked: 7.7,
    },
  ]);

  // Shift Schedules State
  const [shifts] = useState<ShiftSchedule[]>([
    {
      id: 'SH-01',
      name: 'Turno Mañana #1',
      start_time: '08:00',
      end_time: '16:00',
      grace_period_mins: 10,
      assigned_employees: ['Juan Pérez', 'María Gómez'],
    },
    {
      id: 'SH-02',
      name: 'Turno Tarde #2',
      start_time: '16:00',
      end_time: '00:00',
      grace_period_mins: 10,
      assigned_employees: ['Carlos Mendoza', 'Ana Rojas'],
    },
  ]);

  // Exceptions State
  const [isExceptionOpen, setIsExceptionOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    employee_name: '',
    type: 'PERMISO_GOCE' as ExceptionRecord['type'],
    date_range: '',
    notes: '',
  });
  const [exceptionError, setExceptionError] = useState<string | undefined>();

  const [exceptions, setExceptions] = usePersistentState<ExceptionRecord[]>('incidencias', [
    {
      id: 'EXC-101',
      employee_name: 'María Gómez',
      type: 'LICENCIA_MEDICA',
      date_range: '10/08/2026 - 11/08/2026',
      notes: 'Reposo médico certificado',
      status: 'APPROVED',
    },
  ]);

  const handlePunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clockPin) return;

    const newLog: AttendanceLog = {
      id: `LOG-${7000 + logs.length + 1}`,
      timestamp: formatDateTime(new Date()),
      employee_name: 'Juan Pérez',
      role: 'CAJERO',
      event_type: clockEventType,
      terminal: 'Caja 1 Mostrador',
      status: 'ON_TIME',
      lateness_minutes: 0,
      hours_worked: 8.0,
    };

    setLogs((prev) => [newLog, ...prev]);
    setClockPin('');
    toast(`${EVENT_LABEL[clockEventType]} registrada`, 'success');
  };

  const filteredLogs = useMemo(() => {
    const q = searchQueryDebounced.toLowerCase();
    return logs.filter(
      (l) =>
        (l.employee_name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)) &&
        (statusFilter === 'ALL' || l.status === statusFilter),
    );
  }, [logs, searchQueryDebounced, statusFilter]);

  const presentNow = logs.filter((l) => l.event_type === 'CLOCK_IN').length;
  const totalHours = logs.reduce((s, l) => s + (l.hours_worked ?? 0), 0);
  const openIncidents = exceptions.filter((e) => e.status === 'PENDING').length;

  const logColumns: Array<Column<AttendanceLog>> = [
    {
      key: 'when',
      header: 'Fecha y hora',
      width: '170px',
      render: (l) => <span className="font-mono tnum text-body text-ink-2">{l.timestamp}</span>,
    },
    {
      key: 'employee',
      sortValue: (l) => l.employee_name,
      header: 'Empleado',
      card: 'title',
      render: (l) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{l.employee_name}</p>
          <p className="text-micro uppercase text-ink-3">{l.role}</p>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Evento',
      width: '150px',
      render: (l) => <Badge>{EVENT_LABEL[l.event_type]}</Badge>,
    },
    {
      key: 'terminal',
      header: 'Terminal',
      width: '170px',
      render: (l) => <span className="text-body text-ink-2 truncate">{l.terminal}</span>,
    },
    {
      key: 'hours',
      header: 'Jornada',
      width: '190px',
      render: (l) =>
        typeof l.hours_worked === 'number' ? (
          <Meter
            value={l.hours_worked}
            max={SHIFT_HOURS}
            label={`Jornada de ${l.employee_name}`}
            hint={`${l.hours_worked.toFixed(1)} h`}
            tone={l.hours_worked >= SHIFT_HOURS ? 'success' : 'warning'}
          />
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      card: 'meta',
      align: 'right',
      width: '150px',
      render: (l) => (
        <Badge tone={STATUS_TONE[l.status]}>
          {STATUS_LABEL[l.status]}
          {l.lateness_minutes > 0 ? ` · ${l.lateness_minutes} min` : ''}
        </Badge>
      ),
    },
  ];

  const shiftColumns: Array<Column<ShiftSchedule>> = [
    {
      key: 'name',
      header: 'Turno',
      render: (s) => <span className="text-base font-semibold text-ink">{s.name}</span>,
    },
    {
      key: 'hours',
      header: 'Horario',
      width: '170px',
      render: (s) => (
        <span className="font-mono tnum text-ink-2">
          {s.start_time} – {s.end_time}
        </span>
      ),
    },
    {
      key: 'grace',
      header: 'Tolerancia',
      align: 'right',
      width: '120px',
      render: (s) => <span className="font-mono tnum text-ink-2">{s.grace_period_mins} min</span>,
    },
    {
      key: 'people',
      header: 'Asignados',
      render: (s) => (
        <span className="text-body text-ink-2">{s.assigned_employees.join(' · ')}</span>
      ),
    },
  ];

  const exceptionColumns: Array<Column<ExceptionRecord>> = [
    {
      key: 'employee',
      header: 'Empleado',
      render: (x) => <span className="text-base font-semibold text-ink">{x.employee_name}</span>,
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '190px',
      render: (x) => <Badge tone="accent">{EXCEPTION_LABEL[x.type]}</Badge>,
    },
    {
      key: 'range',
      header: 'Periodo',
      width: '210px',
      render: (x) => <span className="font-mono tnum text-body text-ink-2">{x.date_range}</span>,
    },
    { key: 'notes', header: 'Notas', render: (x) => <span className="text-ink-2">{x.notes}</span> },
    {
      key: 'status',
      header: 'Estado',
      align: 'right',
      width: '130px',
      render: (x) => (
        <Badge tone={x.status === 'APPROVED' ? 'success' : 'warning'}>
          {x.status === 'APPROVED' ? 'Aprobada' : 'Pendiente'}
        </Badge>
      ),
    },
  ];

  /* Los empleados salen de los fichajes: no se teclea un nombre a mano, que es
     como acaban existiendo dos fichas de la misma persona. */
  const employeeNames = useMemo(
    () => [...new Set(logs.map((l) => l.employee_name))].sort((a, b) => a.localeCompare(b, 'es')),
    [logs],
  );

  const closeExceptionModal = () => {
    setIsExceptionOpen(false);
    setExceptionError(undefined);
    setExceptionForm({ employee_name: '', type: 'PERMISO_GOCE', date_range: '', notes: '' });
  };

  const saveException = () => {
    if (!exceptionForm.employee_name) {
      setExceptionError('Elija un empleado.');
      return;
    }
    if (!exceptionForm.notes.trim()) {
      setExceptionError('Indique el motivo de la incidencia.');
      return;
    }

    setExceptions((prev) => [
      {
        id: `INC-${1000 + prev.length + 1}`,
        employee_name: exceptionForm.employee_name,
        type: exceptionForm.type,
        date_range: exceptionForm.date_range.trim() || new Date().toLocaleDateString('es-BO'),
        notes: exceptionForm.notes.trim(),
        // Nace pendiente: aprobarla es decisión de un responsable, no del alta.
        status: 'PENDING',
      },
      ...prev,
    ]);

    toast('Incidencia registrada', 'success');
    closeExceptionModal();
  };

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Recursos humanos"
          subtitle="Fichajes de entrada y salida, turnos asignados e incidencias del personal."
          actions={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsExceptionOpen(true)}>
              Nueva incidencia
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de recursos humanos"
            />
          }
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatTile
            label="Presentes ahora"
            value={presentNow}
            hint="con entrada registrada"
            icon={<UserCheck className="w-4 h-4" />}
            tone="success"
          />
          <StatTile
            label="Horas del periodo"
            value={totalHours.toFixed(1)}
            hint={`${logs.length} fichajes`}
            icon={<Clock className="w-4 h-4" />}
            tone="accent"
          />
          <StatTile
            label="Incidencias abiertas"
            value={openIncidents}
            hint="pendientes de aprobar"
            icon={<FileText className="w-4 h-4" />}
            tone={openIncidents > 0 ? 'warning' : 'neutral'}
          />
        </div>

        {activeSubTab === 'timeclock' && (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5 items-start">
            <Card title="Marcar fichaje" icon={<Award className="w-4 h-4" />}>
              <form onSubmit={handlePunch} className="space-y-4">
                <Select
                  label="Evento"
                  value={clockEventType}
                  onChange={(e) => setClockEventType(e.target.value as AttendanceLog['event_type'])}
                >
                  {(Object.keys(EVENT_LABEL) as Array<AttendanceLog['event_type']>).map((k) => (
                    <option key={k} value={k}>
                      {EVENT_LABEL[k]}
                    </option>
                  ))}
                </Select>

                <Input
                  label="PIN del empleado"
                  type="password"
                  maxLength={6}
                  value={clockPin}
                  onChange={(e) => setClockPin(e.target.value)}
                  leading={<Lock className="w-4 h-4" />}
                  placeholder="••••"
                  inputSize="lg"
                  className="[&_input]:text-center [&_input]:font-mono [&_input]:tracking-[0.4em]"
                />

                <Button type="submit" block size="lg" disabled={!clockPin}>
                  Registrar
                </Button>
              </form>
            </Card>

            <div className="space-y-4 min-w-0">
              <Toolbar
                search={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Buscar por empleado o registro…"
                filters={
                  <select
                    aria-label="Estado"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-2.5 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer hover:border-ink-3 transition-colors duration-fast ease-ease"
                  >
                    <option value="ALL">Todos los estados</option>
                    {(Object.keys(STATUS_LABEL) as Array<AttendanceLog['status']>).map((k) => (
                      <option key={k} value={k}>
                        {STATUS_LABEL[k]}
                      </option>
                    ))}
                  </select>
                }
              />

              <DataTable
                caption="Fichajes de entrada y salida del personal"
                columns={logColumns}
                rows={filteredLogs}
                pageSize={25}
                rowKey={(l) => l.id}
                empty={
                  <EmptyState
                    icon={<Clock className="w-6 h-6" />}
                    title="Sin fichajes que coincidan"
                    hint="Ajuste la búsqueda o el filtro de estado."
                  />
                }
              />
            </div>
          </div>
        )}

        {activeSubTab === 'shifts' && (
          <Card
            title="Turnos configurados"
            subtitle="El horario define a partir de cuándo un fichaje cuenta como retraso."
            icon={<Calendar className="w-4 h-4" />}
            padding="none"
          >
            <DataTable
              caption="Turnos programados por empleado"
              columns={shiftColumns}
              rows={shifts}
              rowKey={(s) => s.id}
              dense
              className="border-0 rounded-none"
            />
          </Card>
        )}

        {activeSubTab === 'exceptions' && (
          <DataTable
            caption="Incidencias de asistencia abiertas y resueltas"
            columns={exceptionColumns}
            rows={exceptions}
            rowKey={(x) => x.id}
            empty={
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="Sin incidencias registradas"
                hint="Permisos, licencias y vacaciones aparecerán aquí."
              />
            }
          />
        )}
      </div>

      {/* Alta de incidencia. Antes este botón solo lanzaba un aviso con el texto
          «Registrar incidencia» y no registraba nada. */}
      <Modal
        isOpen={isExceptionOpen}
        onClose={closeExceptionModal}
        icon={<Plus className="w-4 h-4" />}
        title="Nueva incidencia"
        subtitle="Permisos, licencias y faltas justificadas del personal."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeExceptionModal}>
              Cancelar
            </Button>
            <Button onClick={saveException} icon={<Plus className="w-4 h-4" />}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Empleado"
            value={exceptionForm.employee_name}
            onChange={(e) => setExceptionForm({ ...exceptionForm, employee_name: e.target.value })}
            error={exceptionError}
          >
            <option value="">Elija un empleado…</option>
            {employeeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo"
              value={exceptionForm.type}
              onChange={(e) =>
                setExceptionForm({
                  ...exceptionForm,
                  type: e.target.value as ExceptionRecord['type'],
                })
              }
            >
              {(Object.keys(EXCEPTION_LABEL) as Array<ExceptionRecord['type']>).map((t) => (
                <option key={t} value={t}>
                  {EXCEPTION_LABEL[t]}
                </option>
              ))}
            </Select>
            <Input
              label="Periodo"
              placeholder="14/08/2026 – 16/08/2026"
              value={exceptionForm.date_range}
              onChange={(e) => setExceptionForm({ ...exceptionForm, date_range: e.target.value })}
            />
          </div>

          <Textarea
            label="Motivo"
            rows={3}
            hint="Queda en el expediente del empleado: conviene concretar."
            value={exceptionForm.notes}
            onChange={(e) => setExceptionForm({ ...exceptionForm, notes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};

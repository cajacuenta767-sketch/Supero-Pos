import React, { useState } from 'react';
import { 
  UserCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Plus, 
  Lock, 
  FileText, 
  Award
} from 'lucide-react';

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

export const HrAttendanceView: React.FC = () => {
 const [activeSubTab, setActiveSubTab] = useState<'timeclock' | 'shifts' | 'engine' | 'exceptions'>('timeclock');

  // Time Clock State
 const [clockPin, setClockPin] = useState('');
 const [clockEventType, setClockEventType] = useState<'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT'>('CLOCK_IN');

  // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');

  // Attendance Logs State
 const [logs, setLogs] = useState<AttendanceLog[]>([
    {
 id: 'LOG-7001',
 timestamp: '14/08/2026 07:55',
 employee_name: 'Juan Pérez',
 role: 'CAJERO',
 event_type: 'CLOCK_IN',
 terminal: 'Caja 1 Principal',
 status: 'ON_TIME',
 lateness_minutes: 0,
 hours_worked: 8.0
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
 hours_worked: 7.7
    }
  ]);

  // Shift Schedules State
 const [shifts] = useState<ShiftSchedule[]>([
    { id: 'SH-01', name: 'Turno Mañana #1', start_time: '08:00', end_time: '16:00', grace_period_mins: 10, assigned_employees: ['Juan Pérez', 'María Gómez'] },
    { id: 'SH-02', name: 'Turno Tarde #2', start_time: '16:00', end_time: '00:00', grace_period_mins: 10, assigned_employees: ['Carlos Mendoza', 'Ana Rojas'] }
  ]);

  // Exceptions State
 const [exceptions] = useState<ExceptionRecord[]>([
    { id: 'EXC-101', employee_name: 'María Gómez', type: 'LICENCIA_MEDICA', date_range: '10/08/2026 - 11/08/2026', notes: 'Reposo médico certificado', status: 'APPROVED' }
  ]);
 const [, setIsExceptionModalOpen] = useState(false);

 const handleClockPUNCH = (e: React.FormEvent) => {
 e.preventDefault();
 if (!clockPin) return;

 const newLog: AttendanceLog = {
 id: `LOG-${Math.floor(7000 + Math.random() * 900)}`,
 timestamp: new Date().toLocaleString('es-ES'),
 employee_name: 'Juan Pérez (Cajero)',
 role: 'CAJERO',
 event_type: clockEventType,
 terminal: 'Caja 1 Mostrador',
 status: 'ON_TIME',
 lateness_minutes: 0,
 hours_worked: 8.0
    };

 setLogs(prev => [newLog, ...prev]);
 setClockPin('');
 alert(`✅ Marcación de ${clockEventType} registrada correctamente. Asistencia validada.`);
  };

 const filteredLogs = logs.filter(l => 
 l.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 l.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-accent" />
            Recursos Humanos & Control de Asistencia POS
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Fichaje TimeClock en terminal, validación de turnos, cálculo automático de horas/retrasos y licencias
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('timeclock')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'timeclock' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Clock className="w-4 h-4" />
            TimeClock (Fichaje)
          </button>
          <button
 onClick={() => setActiveSubTab('shifts')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'shifts' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Turnos & Programación
          </button>
          <button
 onClick={() => setActiveSubTab('engine')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'engine' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Award className="w-4 h-4" />
            Cálculo de Incidencias
          </button>
          <button
 onClick={() => setActiveSubTab('exceptions')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'exceptions' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <FileText className="w-4 h-4" />
            Permisos & Licencias
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TIMECLOCK (FICHAJE EN TERMINAL) */}
      {activeSubTab === 'timeclock' && (
        <div className="max-w-xl mx-auto bg-raised p-8 rounded-md border border-line shadow-e3 space-y-6 text-center">
          <div>
            <div className="w-16 h-16 bg-accent-soft text-accent rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-title font-black text-ink">Marcación de Asistencia en Terminal POS</h2>
            <p className="text-body text-ink-3 mt-1">Ingrese su PIN personal de 4 a 6 dígitos para validar entrada/salida</p>
          </div>

          <form onSubmit={handleClockPUNCH} className="space-y-6">
            <div className="grid grid-cols-2 gap-3 text-body font-bold">
              <button
 type="button"
 onClick={() => setClockEventType('CLOCK_IN')}
 className={`p-3.5 rounded-md border flex items-center justify-center gap-2 transition-all ${
 clockEventType === 'CLOCK_IN' ? 'bg-ok text-white border-emerald-600 shadow-e2' : 'bg-sunken text-ink-2'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> ENTRADA (CLOCK IN)
              </button>

              <button
 type="button"
 onClick={() => setClockEventType('BREAK_START')}
 className={`p-3.5 rounded-md border flex items-center justify-center gap-2 transition-all ${
 clockEventType === 'BREAK_START' ? 'bg-warn text-white border-amber-600 shadow-e2' : 'bg-sunken text-ink-2'
                }`}
              >
                <Clock className="w-4 h-4" /> INICIO DESCANSO
              </button>

              <button
 type="button"
 onClick={() => setClockEventType('BREAK_END')}
 className={`p-3.5 rounded-md border flex items-center justify-center gap-2 transition-all ${
 clockEventType === 'BREAK_END' ? 'bg-accent text-white border-blue-600 shadow-e2' : 'bg-sunken text-ink-2'
                }`}
              >
                <Clock className="w-4 h-4" /> FIN DESCANSO
              </button>

              <button
 type="button"
 onClick={() => setClockEventType('CLOCK_OUT')}
 className={`p-3.5 rounded-md border flex items-center justify-center gap-2 transition-all ${
 clockEventType === 'CLOCK_OUT' ? 'bg-danger text-white border-rose-600 shadow-e2' : 'bg-sunken text-ink-2'
                }`}
              >
                <XCircle className="w-4 h-4" /> SALIDA (CLOCK OUT)
              </button>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-body text-ink-2 block">PIN Personal (4 a 6 dígitos) *</label>
              <input
 type="password"
 required
 maxLength={6}
 value={clockPin}
 onChange={(e) => setClockPin(e.target.value)}
 placeholder="• • • •"
 className="w-full p-4 bg-sunken border border-line rounded-md font-mono text-center font-black text-display tracking-widest text-ink"
              />
            </div>

            <div className="p-3 bg-accent-soft border border-accent/30 rounded-md text-left text-micro text-accent-ink font-semibold">
              🔒 Regla de Seguridad: La terminal POS requiere registro oficial de ENTRADA para abrir la caja física.
            </div>

            <button
 type="submit"
 className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-md font-black text-base shadow-e2 flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" /> CONFIRMAR MARCA EN ATÓMICO
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: SHIFT MANAGEMENT */}
      {activeSubTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-raised p-4 rounded-md border border-line shadow-e1">
            <h3 className="font-extrabold text-base text-ink">Programación de Turnos & Tolerancia de Ingreso</h3>
            <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow">
              <Plus className="w-4 h-4" /> Crear Horario de Trabajo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shifts.map(s => (
              <div key={s.id} className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h4 className="font-extrabold text-base text-ink flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" /> {s.name}
                  </h4>
                  <span className="px-2.5 py-1 bg-accent-soft text-accent-ink dark:bg-accent-soft border border-accent/30 rounded-md text-body font-mono font-bold">
                    {s.start_time} - {s.end_time}
                  </span>
                </div>

                <div className="space-y-1 text-body text-ink-2">
                  <p className="font-semibold">Tiempo de Gracia Tolerado: <strong className="text-ink font-mono">{s.grace_period_mins} minutos</strong></p>
                  <p className="font-semibold">Personal Asignado: <strong className="text-ink">{s.assigned_employees.join(', ')}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ATTENDANCE ENGINE & INCIDENCES */}
      {activeSubTab === 'engine' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar marcas por empleado..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink font-semibold"
              />
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4"># Marca ID</th>
                  <th className="p-4">Timestamp Exacto</th>
                  <th className="p-4">Empleado & Rol</th>
                  <th className="p-4">Evento</th>
                  <th className="p-4 font-mono text-center">Horas Trabajadas</th>
                  <th className="p-4 text-center">Estado Incidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredLogs.map((log) => {
 const statusBadge = {
                    ON_TIME: { label: 'A TIEMPO (PUNTUAL)', color: 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30' },
                    LATE: { label: `RETRASO (${log.lateness_minutes} min)`, color: 'bg-danger-soft text-danger-ink dark:bg-danger-soft border-danger/30' },
                    OVERTIME: { label: 'HORAS EXTRAS', color: 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30' },
                    JUSTIFIED: { label: 'JUSTIFICADO', color: 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30' },
                  }[log.status];

 return (
                    <tr key={log.id} className="hover:bg-sunken">
                      <td className="p-4 font-mono font-extrabold text-accent">{log.id}</td>
                      <td className="p-4 font-mono text-ink-2">{log.timestamp}</td>
                      <td className="p-4 font-bold text-ink">{log.employee_name} ({log.role})</td>
                      <td className="p-4 font-bold">
                        <span className="px-2 py-0.5 bg-sunken rounded font-mono text-micro">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-black text-base text-ink">
                        {log.hours_worked ? `${log.hours_worked} hrs` : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-micro font-bold border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: EXCEPTIONS & PERMITS */}
      {activeSubTab === 'exceptions' && (
        <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" /> Licencias Médicas, Permisos & Justificación de Faltas
              </h3>
              <p className="text-body text-ink-3">Registro de excepciones con o sin goce de haber</p>
            </div>
            <button
 onClick={() => setIsExceptionModalOpen(true)}
 className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md font-bold text-body flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" /> Registrar Permiso / Licencia
            </button>
          </div>

          <table className="w-full text-left border-collapse text-body">
            <thead>
              <tr className="bg-sunken text-ink-3 uppercase text-micro font-bold border-b border-line">
                <th className="p-4">Empleado</th>
                <th className="p-4">Tipo de Excepción</th>
                <th className="p-4">Rango de Fechas</th>
                <th className="p-4">Notas / Certificado</th>
                <th className="p-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {exceptions.map(exc => (
                <tr key={exc.id}>
                  <td className="p-4 font-bold text-ink">{exc.employee_name}</td>
                  <td className="p-4 font-semibold text-accent">{exc.type}</td>
                  <td className="p-4 font-mono text-ink-2">{exc.date_range}</td>
                  <td className="p-4 font-semibold text-ink-2">{exc.notes}</td>
                  <td className="p-4 text-right">
                    <span className="px-2.5 py-1 bg-ok-soft text-ok-ink dark:bg-ok-soft border border-ok/30 rounded-md text-micro font-bold">
                      APROBADO
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

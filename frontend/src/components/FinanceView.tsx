import React, { useState } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Building2, 
  QrCode, 
  ArrowRightLeft, 
  ShieldCheck, 
  Plus, 
  Lock, 
  Unlock
} from 'lucide-react';

interface PaymentAccount {
 id: string;
 name: string;
 type: 'CASH_DRAWER' | 'BANK_ACCOUNT' | 'QR_GATEWAY';
 account_number?: string;
 currency: string;
 balance: number;
 status: 'OPEN' | 'LOCKED' | 'RECONCILIATION_PENDING';
 fee_percentage?: number;
 in_transit_balance?: number;
 branch: string;
}

interface FinancialTransaction {
 id: string; // TX-9001
 timestamp: string;
 source_account: string;
 dest_account: string;
 amount: number;
 fee_deducted: number;
 operation_type: 'DEPOSIT_CASH_TO_BANK' | 'POS_SALE_CREDIT' | 'PETTY_CASH_EXPENSE' | 'FEE_COMMISSION';
 voucher_number?: string;
 user_name: string;
}

export const FinanceView: React.FC = () => {
 const [activeSubTab, setActiveSubTab] = useState<'drawers' | 'banks' | 'deposits' | 'treasury'>('treasury');

  // Payment Accounts State
 const [accounts, setAccounts] = useState<PaymentAccount[]>([
    { id: 'ACC-01', name: 'Caja 1 - Principal Mostrador', type: 'CASH_DRAWER', currency: 'USD', balance: 1028.50, status: 'OPEN', branch: 'Sucursal Central' },
    { id: 'ACC-02', name: 'Caja 2 - Expres Rápida', type: 'CASH_DRAWER', currency: 'USD', balance: 450.00, status: 'OPEN', branch: 'Sucursal Central' },
    { id: 'ACC-03', name: 'Banco Mercantil Santa Cruz (Cta Cte)', type: 'BANK_ACCOUNT', account_number: '4010-948201-92', currency: 'USD', balance: 42500.00, status: 'OPEN', branch: 'Oficina Central' },
    { id: 'ACC-04', name: 'Pasarela Digital QR BCP', type: 'QR_GATEWAY', account_number: 'QR-BCP-MERCHANT-88', currency: 'USD', balance: 3450.00, fee_percentage: 1.5, in_transit_balance: 450.00, status: 'OPEN', branch: 'Digital' },
    { id: 'ACC-05', name: 'Red Enlace Tarjetas POS', type: 'QR_GATEWAY', account_number: 'POS-REDENLACE-55', currency: 'USD', balance: 8900.00, fee_percentage: 2.0, in_transit_balance: 0.00, status: 'OPEN', branch: 'Digital' }
  ]);

  // Financial Audit Ledger (financial_transactions_log)
 const [transactions, setTransactions] = useState<FinancialTransaction[]>([
    { id: 'TX-9004', timestamp: '14/08/2026 12:10', source_account: 'Caja 1 - Principal Mostrador', dest_account: 'Banco Mercantil Santa Cruz', amount: 500.00, fee_deducted: 0, operation_type: 'DEPOSIT_CASH_TO_BANK', voucher_number: 'BOL-884920', user_name: 'Juan Pérez' },
    { id: 'TX-9003', timestamp: '14/08/2026 11:45', source_account: 'Cliente Final', dest_account: 'Pasarela Digital QR BCP', amount: 145.00, fee_deducted: 2.18, operation_type: 'POS_SALE_CREDIT', voucher_number: 'QR-VAL-1029', user_name: 'María Gómez' },
    { id: 'TX-9002', timestamp: '14/08/2026 09:30', source_account: 'Caja 1 - Principal Mostrador', dest_account: 'Proveedor Suministros', amount: 35.50, fee_deducted: 0, operation_type: 'PETTY_CASH_EXPENSE', voucher_number: 'REC-3011', user_name: 'Juan Pérez' }
  ]);

  // Deposit Form State (Caja -> Banco)
 const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
 const [sourceAccountId, setSourceAccountId] = useState('ACC-01');
 const [destAccountId, setDestAccountId] = useState('ACC-03');
 const [depositAmount, setDepositAmount] = useState('');
 const [voucherNumber, setVoucherNumber] = useState('');

  // Toggle Remote Drawer Lock
 const handleToggleDrawerLock = (accountId: string) => {
 setAccounts(prev => prev.map(a => a.id === accountId ? {
      ...a,
 status: a.status === 'OPEN' ? 'LOCKED' : 'OPEN'
    } : a));
  };

  // Liquidity Aggregation
 const totalCashInDrawers = accounts.filter(a => a.type === 'CASH_DRAWER').reduce((acc, a) => acc + a.balance, 0);
 const totalBankBalances = accounts.filter(a => a.type === 'BANK_ACCOUNT').reduce((acc, a) => acc + a.balance, 0);
 const totalQRGateways = accounts.filter(a => a.type === 'QR_GATEWAY').reduce((acc, a) => acc + a.balance, 0);
 const globalLiquidity = totalCashInDrawers + totalBankBalances + totalQRGateways;

 const handleExecuteAtomicTransfer = (e: React.FormEvent) => {
 e.preventDefault();
 const amt = parseFloat(depositAmount);
 if (isNaN(amt) || amt <= 0) return;

 const sourceAcc = accounts.find(a => a.id === sourceAccountId);
 const destAcc = accounts.find(a => a.id === destAccountId);

 if (!sourceAcc || !destAcc) return;
 if (amt > sourceAcc.balance) {
 alert(`⚠️ El monto a depositar ($${amt.toFixed(2)}) supera el saldo disponible en ${sourceAcc.name} ($${sourceAcc.balance.toFixed(2)}).`);
 return;
    }

 setAccounts(prev => prev.map(a => {
 if (a.id === sourceAccountId) return { ...a, balance: a.balance - amt };
 if (a.id === destAccountId) return { ...a, balance: a.balance + amt };
 return a;
    }));

 const newTx: FinancialTransaction = {
 id: `TX-${Math.floor(9000 + Math.random() * 900)}`,
 timestamp: new Date().toLocaleString('es-ES'),
 source_account: sourceAcc.name,
 dest_account: destAcc.name,
 amount: amt,
 fee_deducted: 0,
 operation_type: 'DEPOSIT_CASH_TO_BANK',
 voucher_number: voucherNumber || `BOL-${Date.now()}`,
 user_name: 'Administrador (Firma Digital)'
    };

 setTransactions(prev => [newTx, ...prev]);
 setIsDepositModalOpen(false);
 setDepositAmount('');
 setVoucherNumber('');
 alert(`✅ Depósito registrado correctamente. Se restó $${amt.toFixed(2)} de ${sourceAcc.name} y se acreditó en ${destAcc.name}.`);
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-accent" />
            Cuentas de Pago y Finanzas Globales
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Administración centralizada de cajas físicas, cuentas bancarias, pasarelas QR y transferencias internas
          </p>
        </div>

        {/* Sub-tabs Switcher */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('treasury')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'treasury' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Saldo Consolidado Global
          </button>
          <button
 onClick={() => setActiveSubTab('drawers')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'drawers' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Cajas Físicas Mostrador
          </button>
          <button
 onClick={() => setActiveSubTab('banks')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'banks' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Cuentas Bancarias & QR
          </button>
          <button
 onClick={() => setIsDepositModalOpen(true)}
 className="px-3.5 py-2 bg-ok hover:opacity-90 text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow"
          >
            <ArrowRightLeft className="w-4 h-4" /> Depósito Caja → Banco
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TREASURY & GLOBAL LIQUIDITY DASHBOARD */}
      {activeSubTab === 'treasury' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-raised rounded-md border border-line shadow-e1">
              <span className="text-body text-ink-3 font-bold uppercase">Cajas Físicas Mostrador</span>
              <p className="font-mono font-black text-display text-ok mt-1">${totalCashInDrawers.toFixed(2)}</p>
              <span className="text-micro text-ink-3">Efectivo acumulado en gavetas</span>
            </div>

            <div className="p-5 bg-raised rounded-md border border-line shadow-e1">
              <span className="text-body text-ink-3 font-bold uppercase">Cuentas Bancarias Corporativas</span>
              <p className="font-mono font-black text-display text-accent mt-1">${totalBankBalances.toFixed(2)}</p>
              <span className="text-micro text-ink-3">Fondos acreditados en banco</span>
            </div>

            <div className="p-5 bg-raised rounded-md border border-line shadow-e1">
              <span className="text-body text-ink-3 font-bold uppercase">Pasarelas Digitales & QR</span>
              <p className="font-mono font-black text-display text-accent mt-1">${totalQRGateways.toFixed(2)}</p>
              <span className="text-micro text-ink-3">Saldo neto tras comisiones</span>
            </div>

            <div className="p-5 bg-accent dark:bg-accent-soft text-white rounded-md border border-blue-500 shadow-e1">
              <span className="text-body font-bold uppercase text-accent-ink">Liquidez Total Consolidada</span>
              <p className="font-mono font-black text-display mt-1">${globalLiquidity.toFixed(2)}</p>
              <span className="text-micro text-accent-ink">Dinero total líquido disponible</span>
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" /> Libro Mayor de Movimientos Cruzados (Historial Completo)
            </h3>
            <p className="text-body text-ink-3">Registro cronológico de entradas, egresos, transferencias internas y comisiones</p>

            <div className="overflow-hidden border border-line rounded-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                    <th className="p-4"># Transacción</th>
                    <th className="p-4">Fecha & Hora</th>
                    <th className="p-4">Tipo Operación</th>
                    <th className="p-4">Cuenta Origen → Destino</th>
                    <th className="p-4 font-mono text-right">Monto ($)</th>
                    <th className="p-4 font-mono text-right">Comisión Restada</th>
                    <th className="p-4 text-right"># Boleta / Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-body font-mono">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-sunken">
                      <td className="p-4 font-bold text-accent">{tx.id}</td>
                      <td className="p-4 text-ink-3">{tx.timestamp}</td>
                      <td className="p-4 font-sans">
                        <span className="px-2 py-0.5 bg-accent-soft text-accent-ink dark:bg-accent-soft font-bold rounded text-micro">
                          {tx.operation_type}
                        </span>
                      </td>
                      <td className="p-4 font-sans font-bold text-ink">
                        {tx.source_account} → <span className="text-ok">{tx.dest_account}</span>
                      </td>
                      <td className="p-4 text-right font-black text-ink">${tx.amount.toFixed(2)}</td>
                      <td className="p-4 text-right text-danger font-bold">-${tx.fee_deducted.toFixed(2)}</td>
                      <td className="p-4 text-right text-ink-3 font-bold">{tx.voucher_number || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CASH DRAWERS MANAGEMENT */}
      {activeSubTab === 'drawers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-raised p-4 rounded-md border border-line shadow-e1">
            <h3 className="font-extrabold text-base text-ink">Administración de Cajas Físicas de Mostrador</h3>
            <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow">
              <Plus className="w-4 h-4" /> Registrar Nueva Caja Física
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.filter(a => a.type === 'CASH_DRAWER').map(acc => {
 const isLocked = acc.status === 'LOCKED';

 return (
                <div key={acc.id} className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-ok" /> {acc.name}
                      </h3>
                      <span className="text-micro text-ink-3 font-semibold">{acc.branch}</span>
                    </div>

                    <button
 onClick={() => handleToggleDrawerLock(acc.id)}
 className={`px-3 py-1.5 rounded-md text-body font-bold flex items-center gap-1.5 border transition-all ${
 isLocked ? 'bg-danger-soft text-danger-ink dark:bg-danger-soft border-danger/30' : 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30'
                      }`}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      {isLocked ? 'CAJA BLOQUEADA' : 'CAJA ABIERTA'}
                    </button>
                  </div>

                  <div className="space-y-2 text-body">
                    <div className="flex justify-between p-3 bg-sunken rounded-md border border-line">
                      <span className="text-ink-3 font-bold">Efectivo Acumulado en Gaveta:</span>
                      <span className="font-mono font-black text-title text-ok">${acc.balance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BANK ACCOUNTS & GATEWAYS */}
      {activeSubTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-raised p-4 rounded-md border border-line shadow-e1">
            <h3 className="font-extrabold text-base text-ink">Directorio de Cuentas Bancarias & Pasarelas QR</h3>
            <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow">
              <Plus className="w-4 h-4" /> Registrar Cuenta / Pasarela QR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.filter(a => a.type === 'BANK_ACCOUNT' || a.type === 'QR_GATEWAY').map(acc => (
              <div key={acc.id} className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                      {acc.type === 'BANK_ACCOUNT' ? <Building2 className="w-5 h-5 text-accent" /> : <QrCode className="w-5 h-5 text-accent" />}
                      {acc.name}
                    </h3>
                    <span className="text-micro text-ink-3 font-mono">Nº Cta / Merchant: {acc.account_number}</span>
                  </div>

                  {acc.fee_percentage && (
                    <span className="px-2.5 py-1 bg-warn-soft text-warn-ink dark:bg-warn-soft border border-warn/30 rounded-md font-mono text-micro font-bold">
                      Comisión: {acc.fee_percentage}%
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-body font-mono">
                  <div className="flex justify-between p-3 bg-sunken rounded-md border border-line">
                    <span className="text-ink-3">Saldo Acreditado:</span>
                    <span className="font-bold text-ink text-base">${acc.balance.toFixed(2)}</span>
                  </div>
                  {acc.in_transit_balance !== undefined && (
                    <div className="flex justify-between p-3 bg-accent-soft rounded-md border border-accent/30">
                      <span className="text-accent-ink font-bold">Saldo Pendiente en Tránsito:</span>
                      <span className="font-bold text-accent-ink text-base">${acc.in_transit_balance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTERNAL TRANSFER / DEPOSIT MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-md overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-ok" /> Depósito Interno: Caja → Banco
              </h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <form onSubmit={handleExecuteAtomicTransfer} className="p-5 space-y-4 text-body">
              <div>
                <label className="font-bold text-ink-2">Cuenta de Origen (Caja Física) *</label>
                <select
 value={sourceAccountId}
 onChange={(e) => setSourceAccountId(e.target.value)}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                >
                  {accounts.filter(a => a.type === 'CASH_DRAWER').map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Saldo: ${a.balance.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-ink-2">Cuenta de Destino (Banco Concentrador) *</label>
                <select
 value={destAccountId}
 onChange={(e) => setDestAccountId(e.target.value)}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                >
                  {accounts.filter(a => a.type === 'BANK_ACCOUNT').map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-ink-2">Monto a Depositar ($) *</label>
                <input
 type="number" step="0.01" required
 value={depositAmount}
 onChange={(e) => setDepositAmount(e.target.value)}
 placeholder="0.00"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono font-bold text-base text-ok"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2"># Boleta de Depósito / Comprobante Bancario *</label>
                <input
 type="text" required
 value={voucherNumber}
 onChange={(e) => setVoucherNumber(e.target.value)}
 placeholder="Ej. BOL-904812"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsDepositModalOpen(false)} className="px-4 py-2 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-ok hover:opacity-90 text-white rounded-md font-extrabold shadow">
                  Ejecutar Depósito Síncrono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

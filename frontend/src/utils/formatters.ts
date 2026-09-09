export const formatCurrency = (amount: number, currency = 'BOB'): string => {
  const symbol = currency === 'BOB' ? 'Bs.' : '$';
  return `${symbol} ${Number(amount || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDecimal = (value: number, decimals = 2): string => {
  return Number(value || 0).toFixed(decimals);
};

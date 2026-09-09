export const buildThermalReceiptText = (
  ticketNumber: string,
  companyName: string,
  companyNit: string,
  items: Array<{ name: string; qty: number; price: number; subtotal: number }>,
  totalAmount: number,
  paperWidth: '80mm' | '58mm' = '80mm'
): string => {
  const lineLength = paperWidth === '80mm' ? 32 : 24;
  const separator = '-'.repeat(lineLength);

  let receipt = '';
  receipt += `${companyName.center(lineLength)}\n`;
  receipt += `NIT: ${companyNit}\n`;
  receipt += `TICKET #: ${ticketNumber}\n`;
  receipt += `${separator}\n`;

  items.forEach(item => {
    const itemLine = `${item.qty}x ${item.name.substring(0, 16)}`;
    const priceLine = `Bs. ${item.subtotal.toFixed(2)}`;
    receipt += `${itemLine.padEnd(lineLength - priceLine.length)}${priceLine}\n`;
  });

  receipt += `${separator}\n`;
  receipt += `TOTAL: Bs. ${totalAmount.toFixed(2)}\n`;
  receipt += `${separator}\n`;
  receipt += `GRACIAS POR SU COMPRA\n`;

  return receipt;
};

// Helper extension for centering strings
declare global {
  interface String {
    center(length: number): string;
  }
}

String.prototype.center = function (length: number) {
  const str = this.toString();
  if (str.length >= length) return str.substring(0, length);
  const leftPadding = Math.floor((length - str.length) / 2);
  return ' '.repeat(leftPadding) + str;
};

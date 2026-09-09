// ESC/POS Thermal Printer & Cash Drawer Native Interfacing Module
// Sends raw hex commands for 80mm paper cutting and RJ11 drawer kick

const ESC_POS_COMMANDS = {
  INIT: Buffer.from([0x1b, 0x40]),               // ESC @ (Initialize printer)
  ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]), // ESC a 1 (Align center)
  ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]),   // ESC a 0 (Align left)
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),      // ESC E 1 (Bold on)
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),     // ESC E 0 (Bold off)
  CUT_PAPER: Buffer.from([0x1d, 0x56, 0x01]),    // GS V 1 (Full paper cut)
  DRAWER_KICK: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 (Kick drawer RJ11)
};

function formatTicketESCPOSText(saleData) {
  const header = `=== SUPERO POS ENTERPRISE ===\nTicket #${saleData.saleId || '1042'}\nFecha: ${new Date().toLocaleString()}\n------------------------------\n`;
  let itemsText = '';

  if (saleData.items && Array.isArray(saleData.items)) {
    for (const item of saleData.items) {
      itemsText += `${item.name}\n${item.quantity} x $${item.unit_price} = $${item.subtotal.toFixed(2)}\n`;
      if (item.serial_number) {
        itemsText += `  IMEI: ${item.serial_number}\n`;
      }
    }
  }

  const footer = `------------------------------\nTOTAL: $${saleData.total ? saleData.total.toFixed(2) : '0.00'}\nPago: ${saleData.payment_method || 'CASH'}\n==============================\n¡Gracias por su compra!\n\n`;

  return Buffer.concat([
    ESC_POS_COMMANDS.INIT,
    ESC_POS_COMMANDS.ALIGN_CENTER,
    ESC_POS_COMMANDS.BOLD_ON,
    Buffer.from(header, 'latin1'),
    ESC_POS_COMMANDS.BOLD_OFF,
    ESC_POS_COMMANDS.ALIGN_LEFT,
    Buffer.from(itemsText, 'latin1'),
    ESC_POS_COMMANDS.ALIGN_CENTER,
    Buffer.from(footer, 'latin1'),
    ESC_POS_COMMANDS.DRAWER_KICK,
    ESC_POS_COMMANDS.CUT_PAPER,
  ]);
}

module.exports = {
  ESC_POS_COMMANDS,
  formatTicketESCPOSText,
};

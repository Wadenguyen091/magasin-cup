const ORDER_SHEET = 'Đơn hàng';
const ITEM_SHEET = 'Sản phẩm đơn';

function doGet() {
  return json_({ ok: true, service: 'MAGASIN CUP orders' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const raw = (e && e.parameter && e.parameter.payload) || (e && e.postData && e.postData.contents) || '{}';
    const o = JSON.parse(raw);
    if (!o.code || !o.contact || !Array.isArray(o.lines)) throw new Error('Invalid order');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const orders = ss.getSheetByName(ORDER_SHEET);
    const items = ss.getSheetByName(ITEM_SHEET);
    const last = orders.getLastRow();
    if (last > 1) {
      const existing = orders.getRange(2, 1, last - 1, 1).getDisplayValues().flat();
      if (existing.includes(o.code)) return json_({ ok: true, duplicate: true, code: o.code });
    }

    const hasPrint = o.lines.some(l => ['cups', 'bowls'].includes(l.tab));
    const logoType = !hasPrint ? 'Không áp dụng' : (o.kind === 'A' ? 'Đã có logo' : 'Cần thiết kế');
    const logoFiles = (o.files || []).filter(f => f && f.url);
    const logoText = logoFiles.length
      ? logoFiles.map((f, i) => 'Tải logo ' + (i + 1) + ' · ' + (f.name || 'logo')).join('\n')
      : (o.files || []).map(f => f.name || '').filter(Boolean).join(', ');
    const orderRow = [
      o.code, new Date(o.createdAt || Date.now()), 'Mới',
      o.contact.name || '', o.contact.phone || '', o.contact.shop || '',
      o.contact.deliv || '', o.contact.province || '',
      Number(o.total || 0), o.lines.length, logoType,
      logoText, Number(o.sides || 0),
      o.contact.note || '', 'Website', Boolean(o.consent && o.consent.privacy),
      (o.consent && o.consent.policyVersion) || '', JSON.stringify(o)
    ];
    const orderRowIndex = nextRow_(orders);
    orders.getRange(orderRowIndex, 1, 1, 18).setValues([orderRow]);
    if (logoFiles.length) {
      const rich = SpreadsheetApp.newRichTextValue().setText(logoText);
      let start = 0;
      logoFiles.forEach((file, i) => {
        const label = 'Tải logo ' + (i + 1) + ' · ' + (file.name || 'logo');
        rich.setLinkUrl(start, start + label.length, file.url);
        start += label.length + 1;
      });
      orders.getRange(orderRowIndex, 12).setRichTextValue(rich.build()).setWrap(true);
    }

    const categories = { cups: 'Ly', bowls: 'Tô', lids: 'Nắp', boxes: 'Hộp', straws: 'Ống hút', spoons: 'Muỗng', bags: 'Bọc' };
    const rows = o.lines.map((l, i) => [
      o.code, i + 1, categories[l.tab] || l.tab || '', l.typeName || '',
      l.productName || '', l.sku || '', l.cap || '', Number(l.d || 0) || '',
      Number(l.qty || 0), l.unit || 'cái', l.productKey || '', JSON.stringify(l)
    ]);
    if (rows.length) items.getRange(nextRow_(items), 1, rows.length, 12).setValues(rows);
    return json_({ ok: true, code: o.code });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function nextRow_(sheet) {
  const last = Math.max(sheet.getLastRow(), 2);
  const values = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  const empty = values.findIndex(row => !row[0]);
  return empty >= 0 ? empty + 2 : last + 1;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

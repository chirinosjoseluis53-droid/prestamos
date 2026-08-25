import ExcelJS from 'exceljs';

const THEMES = {
  blue:   { primary: '0F4C8A', header: '1A2744', light: 'E8F0FE', alt: 'F0F4FF', accent: '2563EB' },
  green:  { primary: '059669', header: '14532D', light: 'D1FAE5', alt: 'ECFDF5', accent: '10B981' },
  red:    { primary: 'DC2626', header: '7F1D1D', light: 'FEE2E2', alt: 'FEF2F2', accent: 'EF4444' },
  purple: { primary: '7C3AED', header: '4C1D95', light: 'EDE9FE', alt: 'F5F3FF', accent: '8B5CF6' },
  orange: { primary: 'D97706', header: '78350F', light: 'FEF3C7', alt: 'FFFBEB', accent: 'F59E0B' },
};

const BORDER_THIN = {
  top:    { style: 'thin', color: { argb: 'D1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
  left:   { style: 'thin', color: { argb: 'D1D5DB' } },
  right:  { style: 'thin', color: { argb: 'D1D5DB' } },
};

const BORDER_THICK_TOP = {
  top:    { style: 'medium', color: { argb: '6B7280' } },
  bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
  left:   { style: 'thin', color: { argb: 'D1D5DB' } },
  right:  { style: 'thin', color: { argb: 'D1D5DB' } },
};

function styleHeaderRow(ws, rowIdx, colCount, theme) {
  const row = ws.getRow(rowIdx);
  row.height = 28;
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(rowIdx, c);
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.header } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = BORDER_THIN;
  }
}

function styleDataRow(ws, rowIdx, colCount, isAlt, formats) {
  const row = ws.getRow(rowIdx);
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(rowIdx, c);
    cell.font = { size: 10, name: 'Calibri', color: { argb: '374151' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isAlt ? 'F0F4FF' : 'FFFFFF' },
    };
    cell.border = BORDER_THIN;
    const fmt = formats?.[c - 1];
    if (fmt === 'currency') {
      cell.numFmt = '$#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (fmt === 'percent') {
      cell.numFmt = '0.0%';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (fmt === 'number') {
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (fmt === 'date') {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  }
}

function styleTotalsRow(ws, rowIdx, colCount, theme) {
  const row = ws.getRow(rowIdx);
  row.height = 26;
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(rowIdx, c);
    cell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: '1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.light } };
    cell.border = BORDER_THICK_TOP;
    cell.alignment = { vertical: 'middle' };
  }
}

export async function downloadExcel(filename, sheets, options = {}) {
  const theme = THEMES[options.theme || 'blue'] || THEMES.blue;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SYNC Prestamos';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      },
      properties: { defaultRowHeight: 20 },
    });

    const headers = sheet.headers || [];
    const data = sheet.data || [];
    const colCount = headers.length;
    const colFormats = headers.map(h => h.format || null);
    const colWidths = headers.map(h => h.width || 15);

    ws.columns = headers.map((h, i) => ({
      header: h.header || h.key || '',
      key: h.key || `col${i}`,
      width: colWidths[i],
    }));

    let currentRow = 1;

    // Title row
    if (sheet.title) {
      ws.mergeCells(currentRow, 1, currentRow, colCount);
      const titleCell = ws.getCell(currentRow, 1);
      titleCell.value = sheet.title;
      titleCell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 14, name: 'Calibri' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.primary } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(currentRow).height = 36;
      currentRow++;
    }

    // Subtitle row
    if (sheet.subtitle) {
      ws.mergeCells(currentRow, 1, currentRow, colCount);
      const subCell = ws.getCell(currentRow, 1);
      subCell.value = sheet.subtitle;
      subCell.font = { italic: true, color: { argb: '6B7280' }, size: 10, name: 'Calibri' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.light } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(currentRow).height = 22;
      currentRow++;
    }

    // Spacer
    if (sheet.title || sheet.subtitle) {
      ws.getRow(currentRow).height = 6;
      currentRow++;
    }

    // Header row
    const headerRow = currentRow;
    headers.forEach((h, i) => {
      ws.getCell(currentRow, i + 1).value = h.header || h.key || '';
    });
    styleHeaderRow(ws, currentRow, colCount, theme);
    currentRow++;

    // Data rows
    const dataStartRow = currentRow;
    data.forEach((rowData, rowIdx) => {
      const isAlt = rowIdx % 2 === 1;
      headers.forEach((h, colIdx) => {
        const key = h.key || `col${colIdx}`;
        let val = rowData[key] !== undefined ? rowData[key] : (Array.isArray(rowData) ? rowData[colIdx] : '');
        if (val === null || val === undefined) val = '';
        ws.getCell(currentRow, colIdx + 1).value = val;
      });
      styleDataRow(ws, currentRow, colCount, isAlt, colFormats);
      currentRow++;
    });

    // Totals row
    if (sheet.totals) {
      headers.forEach((h, colIdx) => {
        const key = h.key || `col${colIdx}`;
        const val = sheet.totals[key] !== undefined ? sheet.totals[key] : '';
        ws.getCell(currentRow, colIdx + 1).value = val;
      });
      styleTotalsRow(ws, currentRow, colCount, theme);
      currentRow++;
    }

    // Autofilter on header row
    if (colCount > 0 && data.length > 0) {
      ws.autoFilter = {
        from: { row: headerRow, column: 1 },
        to: { row: headerRow + data.length, column: colCount },
      };
    }

    // Freeze header row
    const freezeRow = (sheet.title ? 1 : 0) + (sheet.subtitle ? 1 : 0) + (sheet.title || sheet.subtitle ? 1 : 0) + 1;
    ws.views = [{ state: 'frozen', ySplit: freezeRow, activeCell: { row: freezeRow + 1, column: 1 } }];

    // Apply number formats for currency/percent columns in data
    data.forEach((_, rowIdx) => {
      headers.forEach((h, colIdx) => {
        if (h.format === 'currency' || h.format === 'percent') {
          const cell = ws.getCell(dataStartRow + rowIdx, colIdx + 1);
          if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
            cell.numFmt = h.format === 'currency' ? '$#,##0.00' : '0.0%';
          }
        }
      });
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename, headers, rows) {
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

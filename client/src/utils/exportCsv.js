function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function escapeCell(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCsv(data, columns, filename) {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = getNestedValue(row, col.key);
        const value = col.formatter ? col.formatter(raw) : raw;
        return escapeCell(value);
      })
      .join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

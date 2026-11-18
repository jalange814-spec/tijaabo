/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const val = cell === undefined || cell === null ? '' : String(cell);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSQLFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

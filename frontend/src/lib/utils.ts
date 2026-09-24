export function evaluateSpintax(text: string, vars: Record<string, string> = {}): string {
  if (!text) return '';
  let result = text;

  // 1. Initial pass: interpolate user variables if present
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), val);
  }

  // 2. Resolve Spintax blocks containing '|' (e.g. {Hello|Hi|Greetings})
  const spintaxRegex = /\{([^{}]*\|[^{}]*)\}/g;
  let iterations = 0;
  while (spintaxRegex.test(result) && iterations < 20) {
    result = result.replace(spintaxRegex, (_, choices) => {
      const parts = choices.split('|');
      return parts[Math.floor(Math.random() * parts.length)];
    });
    iterations++;
  }

  // 3. Final safety pass for any variables that were inside nested Spintax choices
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), val);
  }

  return result;
}


export function exportToCSV(data: any[], filename: string = 'leads.csv') {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(','),
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

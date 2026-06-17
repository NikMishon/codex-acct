import { styleText } from 'node:util';

const colorEnabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

export function paint(style, text) {
  if (!colorEnabled) return text;
  try {
    return styleText(style, text);
  } catch {
    return text;
  }
}

export function humanizeExp(epochSeconds, nowMs = Date.now()) {
  if (typeof epochSeconds !== 'number' || Number.isNaN(epochSeconds)) return '—';
  const deltaMs = epochSeconds * 1000 - nowMs;
  const abs = Math.abs(deltaMs);
  let span;
  if (abs < 60 * 1000) span = `${Math.max(1, Math.round(abs / 1000))}s`;
  else if (abs < 60 * 60 * 1000) span = `${Math.round(abs / 60000)}m`;
  else if (abs < 24 * 60 * 60 * 1000) span = `${Math.round(abs / 3600000)}h`;
  else span = `${Math.round(abs / 86400000)}d`;
  return deltaMs >= 0 ? `in ${span}` : `${span} ago`;
}

function orgLabel(org) {
  if (!org || !org.title) return '—';
  return org.role ? `${org.title} (${org.role})` : org.title;
}

function pad(text, width) {
  const value = String(text);
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

export function printTable(rows) {
  const columns = [
    { title: '', get: (row) => (row.isActive ? '*' : '') },
    { title: 'ALIAS', get: (row) => row.alias + (row.isDefault ? ' (default)' : '') },
    { title: 'EMAIL', get: (row) => row.email ?? '—' },
    { title: 'PLAN', get: (row) => row.plan ?? '—' },
    { title: 'ID-TOKEN', get: (row) => humanizeExp(row.idTokenExp) },
    { title: 'ORG', get: (row) => orgLabel(row.org) },
  ];

  const widths = columns.map((column) =>
    Math.max(column.title.length, ...rows.map((row) => String(column.get(row)).length)),
  );

  const header = columns.map((column, i) => pad(column.title, widths[i])).join('  ');
  console.log(paint('dim', header));

  for (const row of rows) {
    const line = columns.map((column, i) => pad(column.get(row), widths[i])).join('  ');
    console.log(row.isActive ? paint('green', line) : line);
  }
}

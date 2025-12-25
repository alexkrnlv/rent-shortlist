import type { Property } from '../types';

export function exportToCSV(properties: Property[]): string {
  const headers = [
    'ID', 'Name', 'Address', 'URL', 'Price',
    'Latitude', 'Longitude', 'Direct Distance (km)', 'Transit Distance',
    'Transit Duration', 'Walking Distance', 'Walking Duration',
    'Driving Distance', 'Driving Duration', 'Comment', 'Rating', 'BTR', 'Created At', 'Thumbnail', 'Tags',
  ];

  const escapeCSV = (str: string) => '"' + (str || '').replace(/"/g, '""') + '"';

  const rows = properties.map((p) => [
    p.id,
    escapeCSV(p.name),
    escapeCSV(p.address),
    p.url,
    p.price || '',
    p.coordinates?.lat?.toString() || '',
    p.coordinates?.lng?.toString() || '',
    p.distances?.direct?.toFixed(2) || '',
    p.distances?.publicTransport?.distance || '',
    p.distances?.publicTransport?.duration || '',
    p.distances?.walking?.distance || '',
    p.distances?.walking?.duration || '',
    p.distances?.driving?.distance || '',
    p.distances?.driving?.duration || '',
    escapeCSV(p.comment),
    p.rating?.toString() || '',
    p.isBTR ? 'true' : 'false',
    p.createdAt,
    p.thumbnail || '',
    escapeCSV((p.tags || []).join(';')),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseCSV(csvContent: string): Partial<Property>[] {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const properties: Partial<Property>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 4) continue;

    const unescapeCSV = (str: string) => str.replace(/^"|"$/g, '').replace(/""/g, '"');

    const tagsStr = values[19] ? unescapeCSV(values[19]) : '';
    const tags = tagsStr ? tagsStr.split(';').filter(Boolean) : [];

    const property: Partial<Property> = {
      id: values[0] || undefined,
      name: unescapeCSV(values[1]) || '',
      address: unescapeCSV(values[2]) || '',
      url: values[3] || '',
      price: values[4] || undefined,
      coordinates: values[5] && values[6] ? { lat: parseFloat(values[5]), lng: parseFloat(values[6]) } : null,
      comment: unescapeCSV(values[14]) || '',
      rating: values[15] ? parseInt(values[15], 10) : null,
      isBTR: values[16] === 'true',
      createdAt: values[17] || new Date().toISOString(),
      thumbnail: values[18] || undefined,
      tags,
    };

    properties.push(property);
  }

  return properties;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

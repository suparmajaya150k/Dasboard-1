export const SPREADSHEET_ID = '1qnrdyWHZeEhhRq8oWJ_AOtbg7-Y6rk01RXz5_964IyM';

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbGGLUoqoCe4Yyi87-GIqDtVbXTZ56qOy4Nk947Eiv9Gzr7lddI4q8I4jBMUPDKstMug/exec';

export const STORE_NAMES = [
  'KARYA DAME',
  'DR MANSYUR',
  'HALAT',
  'RINGROAD',
  'JOHOR',
  'MARELAN',
  'PANCING',
  'KAPTEN MUSLIM',
  'BINJAI',
  'SIANTAR',
  'RANTAU PRAPAT'
];

export interface DailyRevenue {
  date: string;
  [storeName: string]: any;
  total: number;
}

export interface StoreTarget {
  storeName: string;
  monthlyTargets: number[]; // array of 12 numbers (Jan-Dec)
  yearlyTarget: number;
}

export interface TargetData {
  stores: StoreTarget[];
  overallYearlyTarget: number;
}

export async function fetchDataFromAppsScript(customUrl?: string): Promise<{ revenue: DailyRevenue[]; target: TargetData }> {
  const url = customUrl || localStorage.getItem('apps_script_url') || DEFAULT_APPS_SCRIPT_URL;
  const response = await fetch(url, { redirect: 'follow' });
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Akses Ditolak (403). Di Google Apps Script, pastikan "Who has access" (Siapa yang memiliki akses) sudah diubah menjadi "Anyone" (Siapa saja).');
    }
    throw new Error(`Gagal mengambil data dari Google Apps Script (HTTP ${response.status})`);
  }
  
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (text.includes('Access denied') || text.includes('<!DOCTYPE html>')) {
      throw new Error('Akses Ditolak (403). Di Google Apps Script, pastikan "Who has access" (Siapa yang memiliki akses) sudah diubah menjadi "Anyone" (Siapa saja).');
    }
    throw new Error('Format data dari Google Apps Script tidak valid.');
  }

  if (data.error) {
    throw new Error(`Google Apps Script Error: ${data.error}`);
  }

  return {
    revenue: data.revenue || [],
    target: data.target || { stores: [], overallYearlyTarget: 0 }
  };
}

export async function fetchTargetData(accessToken: string): Promise<TargetData> {
  const range = "'Target Omset 2026'!A3:N17";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API Error (Target):', errorText);
    throw new Error(`Failed to fetch target data: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const rows = data.values || [];
  
  const stores: StoreTarget[] = [];
  
  // Rows 0 to 10 correspond to A3 to A13
  for (let i = 0; i < 11; i++) {
    const row = rows[i];
    if (!row) continue;
    
    const storeName = row[0];
    const monthlyTargets: number[] = [];
    for (let m = 1; m <= 12; m++) {
      monthlyTargets.push(parseRevenueNumber(row[m]));
    }
    
    stores.push({
      storeName: storeName || STORE_NAMES[i],
      monthlyTargets,
      yearlyTarget: parseRevenueNumber(row[13]) // Column N is index 13
    });
  }
  
  // Row 14 corresponds to A17
  const overallRow = rows[14] || [];
  const overallYearlyTarget = parseRevenueNumber(overallRow[13]);
  
  return { stores, overallYearlyTarget };
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseRevenueNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseInt(val.replace(/[^0-9-]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function fetchRevenueData(accessToken: string): Promise<DailyRevenue[]> {
  // Fetch metadata to get actual sheet titles
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!metaRes.ok) {
    const errorText = await metaRes.text();
    console.error('Google Sheets API Error (Metadata):', errorText);
    throw new Error(`Failed to fetch spreadsheet metadata: ${metaRes.status} ${metaRes.statusText}`);
  }

  const metaData = await metaRes.json();
  const actualSheets: string[] = metaData.sheets.map((s: any) => s.properties.title);

  const matchedActualNames: string[] = [];
  const actualToCanonical: Record<string, string> = {};

  for (const expected of STORE_NAMES) {
    const expectedNorm = expected.toLowerCase().replace(/\s+/g, '');
    const actual = actualSheets.find(s => s.toLowerCase().replace(/\s+/g, '') === expectedNorm);
    if (actual) {
      matchedActualNames.push(actual);
      actualToCanonical[actual] = expected;
    } else {
      console.warn(`Could not find sheet for store: ${expected}`);
    }
  }

  if (matchedActualNames.length === 0) {
    throw new Error('No matching sheets found in the spreadsheet.');
  }

  const ranges = matchedActualNames.map(store => `'${store}'!Q39:AC70`);
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet`);
  ranges.forEach(range => url.searchParams.append('ranges', range));
  
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API Error:', errorText);
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  const dateMap = new Map<string, DailyRevenue>();
  const year = 2026;

  data.valueRanges.forEach((sheetData: any, index: number) => {
    let sheetNameRaw = sheetData.range.split('!')[0];
    if (sheetNameRaw.startsWith("'") && sheetNameRaw.endsWith("'")) {
      sheetNameRaw = sheetNameRaw.slice(1, -1);
    }
    const storeName = actualToCanonical[sheetNameRaw] || STORE_NAMES[index];
    const rows = sheetData.values || [];
    
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row || row.length === 0) continue;
      
      const dayStr = row[0]; // Q column
      const day = parseInt(dayStr, 10);
      if (isNaN(day)) continue;
      
      // Iterate through months R to AC (index 1 to 12)
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        // monthIndex 0 = Jan, 11 = Dec
        const colIndex = monthIndex + 1;
        const revenueStr = row[colIndex];
        const revenue = parseRevenueNumber(revenueStr);
        
        // Skip invalid dates (e.g. Feb 30)
        const dateObj = new Date(year, monthIndex, day);
        if (dateObj.getMonth() !== monthIndex) continue;
        
        const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (!dateMap.has(dateKey)) {
          const newEntry: DailyRevenue = { date: dateKey, total: 0 };
          STORE_NAMES.forEach(name => newEntry[name] = 0);
          dateMap.set(dateKey, newEntry);
        }
        
        const entry = dateMap.get(dateKey)!;
        entry[storeName] = revenue;
        entry.total += revenue;
      }
    }
  });
  
  // Convert map to sorted array
  const result = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

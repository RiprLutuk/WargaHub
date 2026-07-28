export interface ParsedFoodSchedule {
  date: string;
  residents: string[];
}

export interface ParsedPatrol {
  date: string;
  time: string;
  officers: string[];
}

export interface ParsedJimpitan {
  date: string;
  amount: number;
}

export interface WaParseResult {
  foodSchedules: ParsedFoodSchedule[];
  patrols: ParsedPatrol[];
  jimpitans: ParsedJimpitan[];
  rawText: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  mei: '05',
  jun: '06', juni: '06',
  jul: '07', juli: '07', julii: '07', jului: '07',
  agu: '08', agustus: '08', ags: '08',
  sep: '09', september: '09',
  okt: '10', oktober: '10',
  nov: '11', november: '11',
  des: '12', desember: '12',
};

function normalizeDate(rawDay: string = '01', rawMonth: string = '07', rawYear: string = '2026'): string {
  const day = rawDay.padStart(2, '0');
  const monthKey = rawMonth.toLowerCase().trim();
  const month = MONTH_MAP[monthKey] || (Number(monthKey) ? String(monthKey).padStart(2, '0') : '07');
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
}

export function parseWaMessage(text: string): WaParseResult {
  const foodSchedules: ParsedFoodSchedule[] = [];
  const patrols: ParsedPatrol[] = [];
  const jimpitans: ParsedJimpitan[] = [];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Detect Jimpitan entries (e.g. "Jimpitan senin tgl 27 07 2026 Rp 24000")
  const jimpitanRegex = /jimpitan.*?(?:tgl|\b)\s*(\d{1,2})[\/\s\.-]+(\d{1,2}|[a-z]+)[\/\s\.-]*(\d{2,4})?.*?Rp\s*([\d\.]+)/i;
  for (const line of lines) {
    const match = line.match(jimpitanRegex);
    if (match && match[1] && match[2] && match[4]) {
      const day = match[1];
      const month = match[2];
      const year = match[3] || '2026';
      const amountStr = match[4].replace(/\./g, '');
      const amount = parseInt(amountStr, 10);
      if (!isNaN(amount)) {
        jimpitans.push({
          date: normalizeDate(day, month, year),
          amount,
        });
      }
    }
  }

  // 2. Detect Patrol announcements (e.g. "PENGUMUMAN JADWAL RONDA... TGL 18-07-2026:")
  const patrolBlockRegex = /(?:JADWAL\s+RONDA|RONDA).*?(\d{1,2})[\/\s\.-]+(\d{1,2}|[a-z]+)[\/\s\.-]+(\d{2,4})/gi;
  let patrolMatch;
  while ((patrolMatch = patrolBlockRegex.exec(text)) !== null) {
    const day = patrolMatch[1] || '01';
    const month = patrolMatch[2] || '07';
    const year = patrolMatch[3] || '2026';
    const date = normalizeDate(day, month, year);

    // Extract names following this match
    const subText = text.slice(patrolMatch.index + patrolMatch[0].length);
    const officerLines = subText.split('\n').slice(0, 10);
    const officers: string[] = [];
    for (const oLine of officerLines) {
      const nameMatch = oLine.match(/^\s*\d+[\.\)]\s*(.+)/);
      if (nameMatch && nameMatch[1]) {
        officers.push(nameMatch[1].trim());
      } else if (oLine.toLowerCase().includes('mohon') || oLine.toLowerCase().includes('kumpul')) {
        break;
      }
    }

    // Extract time (e.g. 22:45)
    const timeMatch = subText.match(/(\d{2}[:\.]\d{2})/);
    const time = timeMatch && timeMatch[1] ? timeMatch[1].replace('.', ':') : '22:45';

    if (officers.length > 0) {
      patrols.push({ date, time, officers });
    }
  }

  // 3. Detect Food Donation schedules
  let currentFoodDate: string | null = null;
  let currentFoodResidents: string[] = [];

  const dayHeaderRegex = /(?:^\d+[:\.]\s*)?(?:hari\s*[a-z]*\s*)?(?:tgl|tanggal)?\s*(\d{1,2})\s*([a-z]+)\s*(\d{4})?/i;

  for (const line of lines) {
    if (!line) continue;
    const lower = line.toLowerCase();
    const isHeaderLine = (lower.includes('hari') || lower.includes('tgl') || lower.includes('juli')) && !lower.includes('ronda') && !lower.includes('jimpitan');

    const headerMatch = line.match(dayHeaderRegex);

    if (isHeaderLine && headerMatch && headerMatch[1] && headerMatch[2] && MONTH_MAP[headerMatch[2].toLowerCase()]) {
      if (currentFoodDate && currentFoodResidents.length > 0) {
        foodSchedules.push({ date: currentFoodDate, residents: [...currentFoodResidents] });
        currentFoodResidents = [];
      }
      const day = headerMatch[1];
      const month = headerMatch[2];
      const year = headerMatch[3] || '2026';
      currentFoodDate = normalizeDate(day, month, year);
    } else if (currentFoodDate && (line.startsWith(':') || lower.includes('bpk') || lower.includes('ibu') || lower.includes('rd'))) {
      const cleanedName = line.replace(/^[:\d\s]+/, '').replace(/^(bpk|ibu|rd)\s+/i, '').trim();
      if (cleanedName && cleanedName.length > 2 && !lower.includes('jadwal') && !lower.includes('pengumuman')) {
        currentFoodResidents.push(cleanedName);
      }
    }
  }

  if (currentFoodDate && currentFoodResidents.length > 0) {
    foodSchedules.push({ date: currentFoodDate, residents: [...currentFoodResidents] });
  }

  return { foodSchedules, patrols, jimpitans, rawText: text };
}

export const ASTANA_TIME_ZONE = 'Asia/Almaty';

// Kazakhstan (Astana) currently uses UTC+5 all year round.
const ASTANA_UTC_OFFSET_HOURS = 5;

interface AstanaNowParts {
  dateStr: string;
  hour: number;
  minute: number;
}

export function getAstanaNowParts(): AstanaNowParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ASTANA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateStr: `${byType.year}-${byType.month}-${byType.day}`,
    hour: Number(byType.hour),
    minute: Number(byType.minute),
  };
}

export function astanaLocalToDate(dateStr: string, hour: number, minute: number): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - ASTANA_UTC_OFFSET_HOURS, minute, 0, 0));
}

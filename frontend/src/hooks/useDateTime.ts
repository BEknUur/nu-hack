import { useState } from 'react';

function buildDate(dateStr: string, hour: number, minute: number): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export interface UseDateTimeReturn {
  dateStr: string;
  setDateStr: (v: string) => void;
  hour: number;
  minute: number;
  date: Date;
  timeLabel: string;
  sliderValue: number;
  sliderPct: number;
  setSlider: (val: number) => void;
}

export function useDateTime(): UseDateTimeReturn {
  const now = new Date();

  const [dateStr, setDateStr] = useState<string>(() => now.toISOString().split('T')[0]);
  const [hour, setHour] = useState<number>(() => now.getHours());
  const [minute, setMinute] = useState<number>(() => Math.floor(now.getMinutes() / 30) * 30);

  const date = buildDate(dateStr, hour, minute);
  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Slider runs 0–47 (each step = 30 min)
  const sliderValue = hour * 2 + (minute === 30 ? 1 : 0);
  const sliderPct = (sliderValue / 47) * 100;

  function setSlider(val: number) {
    setHour(Math.floor(val / 2));
    setMinute((val % 2) * 30);
  }

  return { dateStr, setDateStr, hour, minute, date, timeLabel, sliderValue, sliderPct, setSlider };
}

import { useState } from 'react';
import { astanaLocalToDate, getAstanaNowParts } from '@/utils/astanaTime';

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
  const astanaNow = getAstanaNowParts();

  const [dateStr, setDateStr] = useState<string>(() => astanaNow.dateStr);
  const [hour, setHour] = useState<number>(() => astanaNow.hour);
  const [minute, setMinute] = useState<number>(() => astanaNow.minute);

  const date = astanaLocalToDate(dateStr, hour, minute);
  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Slider runs 0–1439 (each step = 1 min)
  const sliderValue = hour * 60 + minute;
  const sliderPct = (sliderValue / 1439) * 100;

  function setSlider(val: number) {
    setHour(Math.floor(val / 60));
    setMinute(val % 60);
  }

  return { dateStr, setDateStr, hour, minute, date, timeLabel, sliderValue, sliderPct, setSlider };
}

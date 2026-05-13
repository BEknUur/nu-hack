import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import type { Language } from '@/i18n';
import { astanaLocalToDate } from '@/utils/astanaTime';
import type { ScenarioMode, TreeUiMessages } from '@/pages/MapPage/types';

const TREE_UI_BY_LANGUAGE: Record<string, TreeUiMessages> = {
  ru: {
    mapNotReady: 'Карта еще загружается. Попробуйте через секунду.',
    areaMissing: 'Сначала выделите область на карте, затем запускайте подбор.',
    noCandidates: 'В текущей области не найдено точек по выбранным фильтрам.',
    rankFailed: 'Не удалось подобрать точки. Попробуйте еще раз.',
    explainFailed: 'Не удалось получить объяснение для этой точки.',
  },
  kk: {
    mapNotReady: 'Карта әлі жүктелуде. Сәлден кейін қайталап көріңіз.',
    areaMissing: 'Алдымен картадан аймақты таңдаңыз, содан кейін есептеуді іске қосыңыз.',
    noCandidates: 'Таңдалған сүзгілер бойынша бұл аумақта нүкте табылмады.',
    rankFailed: 'Нүктелерді таңдау сәтсіз аяқталды. Қайта байқап көріңіз.',
    explainFailed: 'Бұл нүкте үшін түсіндірме алу мүмкін болмады.',
  },
  en: {
    mapNotReady: 'Map is still loading. Try again in a moment.',
    areaMissing: 'Select an area on the map first, then run ranking.',
    noCandidates: 'No points matched current filters in this map area.',
    rankFailed: 'Could not rank points right now. Please try again.',
    explainFailed: 'Could not generate explanation for this point.',
  },
};

export const SELECTED_BUILDING_SOURCE_ID = 'selected-building-highlight';
export const SELECTED_BUILDING_GLOW_LAYER_ID = 'selected-building-highlight-glow';
export const SELECTED_BUILDING_LINE_LAYER_ID = 'selected-building-highlight-line';
export const WORKER_SOURCE_ID = 'worker-crew-source';
export const WORKER_LAYER_ID = 'worker-crew-layer';

export function getScenarioMode(caseId: string | undefined): ScenarioMode {
  if (caseId === 'apartments') return 'apartments';
  if (caseId === 'trees') return 'trees';
  if (caseId === 'workers') return 'workers';
  if (caseId === 'solar-flowers') return 'solarFlowers';
  return 'default';
}

export function getTreeUiMessages(language: Language) {
  return TREE_UI_BY_LANGUAGE[language] ?? TREE_UI_BY_LANGUAGE.en;
}

export function getDefaultSunExposureRange(dateStr: string) {
  return {
    startDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.startHour, 0),
    endDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.endHour, 0),
    iterations: SUN_EXPOSURE_CONFIG.iterations,
  };
}

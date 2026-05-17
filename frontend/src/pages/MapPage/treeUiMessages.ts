import type { Language } from '@/i18n';

export interface TreeUiMessages {
  mapNotReady: string;
  areaMissing: string;
  noCandidates: string;
  rankFailed: string;
  explainFailed: string;
}

const TREE_UI_BY_LANG: Record<Language, TreeUiMessages> = {
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

export function getTreeUiMessages(language: Language): TreeUiMessages {
  return TREE_UI_BY_LANG[language];
}

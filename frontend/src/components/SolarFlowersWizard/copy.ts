export interface SolarWizardCopy {
  tag: string;
  title: string;
  subtitle: string;
  steps: [string, string, string];

  drawTitle: string;
  drawHint: string;
  drawModeRect: string;
  drawModeCircle: string;
  drawModePoly: string;
  drawModeFree: string;
  drawBtn: string;
  redrawBtn: string;
  clearBtn: string;
  continueBtn: string;
  cancelBtn: string;
  drawingActive: string;
  drawingEsc: string;

  settingsTitle: string;
  panelTypeLabel: string;
  panelFlower: string;
  panelGround: string;
  panelRooftop: string;
  targetLabel: string;
  targetAnnual: string;
  targetWinter: string;
  targetBalanced: string;
  countLabel: string;
  areaLabel: string;
  runBtn: string;
  runningBtn: string;
  backBtn: string;

  resultsTitle: string;
  foundLabel: (n: number) => string;
  resultsHint: string;
  noResults: string;
  rerunBtn: string;
  newAreaBtn: string;
  showPointsBtn: string;
  hidePointsBtn: string;
  scoreLabel: string;
  kwhLabel: string;
  annualFactor: string;
  winterFactor: string;
  shadingFactor: string;
  slopeLabel: string;
  accessLabel: string;
}

export const SOLAR_WIZARD_COPY: Record<'ru' | 'kk' | 'en', SolarWizardCopy> = {
  en: {
    tag: 'Scenario 04',
    title: 'Solar Flowers',
    subtitle: 'Find optimal placements for solar trackers',
    steps: ['Area', 'Settings', 'Results'],

    drawTitle: 'Select the analysis area',
    drawHint: 'Choose a shape and draw the zone where you want to find solar placement candidates.',
    drawModeRect: 'Rectangle',
    drawModeCircle: 'Circle',
    drawModePoly: 'Polygon',
    drawModeFree: 'Freehand',
    drawBtn: 'Start drawing',
    redrawBtn: 'Redraw area',
    clearBtn: 'Clear',
    continueBtn: 'Configure settings',
    cancelBtn: 'Cancel',
    drawingActive: 'Drawing active',
    drawingEsc: 'Press Esc to cancel',

    settingsTitle: 'Configure and run analysis',
    panelTypeLabel: 'Installation type',
    panelFlower: 'Solar Flower',
    panelGround: 'Ground-Mounted',
    panelRooftop: 'Rooftop',
    targetLabel: 'Optimization target',
    targetAnnual: 'Max annual yield',
    targetWinter: 'Max winter yield',
    targetBalanced: 'Balanced',
    countLabel: 'Number of candidates',
    areaLabel: 'Selected area',
    runBtn: 'Run analysis',
    runningBtn: 'Analyzing…',
    backBtn: 'Change area',

    resultsTitle: 'Analysis complete',
    foundLabel: (n) => `${n} candidate${n === 1 ? '' : 's'} found`,
    resultsHint: 'Click any marker on the map to inspect a candidate.',
    noResults: 'No candidates found. Try a larger area or different settings.',
    rerunBtn: 'Re-run',
    newAreaBtn: 'New area',
    showPointsBtn: 'Show points on map',
    hidePointsBtn: 'Hide points on map',
    scoreLabel: 'Score',
    kwhLabel: 'Est. kWh/yr',
    annualFactor: 'Annual irradiance',
    winterFactor: 'Winter irradiance',
    shadingFactor: 'Shading risk',
    slopeLabel: 'Slope',
    accessLabel: 'Access',
  },
  ru: {
    tag: 'Сценарий 04',
    title: 'Солнечные цветы',
    subtitle: 'Поиск оптимальных мест для солнечных трекеров',
    steps: ['Область', 'Настройки', 'Результаты'],

    drawTitle: 'Выберите область анализа',
    drawHint: 'Выберите форму и нарисуйте зону для поиска мест установки.',
    drawModeRect: 'Прямоугольник',
    drawModeCircle: 'Круг',
    drawModePoly: 'Полигон',
    drawModeFree: 'Свободно',
    drawBtn: 'Начать рисование',
    redrawBtn: 'Перерисовать',
    clearBtn: 'Очистить',
    continueBtn: 'К настройкам',
    cancelBtn: 'Отмена',
    drawingActive: 'Рисование активно',
    drawingEsc: 'Esc для отмены',

    settingsTitle: 'Настройте и запустите анализ',
    panelTypeLabel: 'Тип установки',
    panelFlower: 'Солнечный цветок',
    panelGround: 'Наземная',
    panelRooftop: 'Кровельная',
    targetLabel: 'Цель оптимизации',
    targetAnnual: 'Макс. годовая выработка',
    targetWinter: 'Макс. зимняя выработка',
    targetBalanced: 'Баланс',
    countLabel: 'Количество точек',
    areaLabel: 'Площадь',
    runBtn: 'Запустить анализ',
    runningBtn: 'Анализ…',
    backBtn: 'Изменить область',

    resultsTitle: 'Анализ завершён',
    foundLabel: (n) => `Найдено точек: ${n}`,
    resultsHint: 'Нажмите на маркер на карте для просмотра деталей.',
    noResults: 'Точки не найдены. Увеличьте область или измените настройки.',
    rerunBtn: 'Пересчитать',
    newAreaBtn: 'Новая область',
    showPointsBtn: 'Показать точки на карте',
    hidePointsBtn: 'Скрыть точки на карте',
    scoreLabel: 'Балл',
    kwhLabel: 'кВт·ч/год (ест.)',
    annualFactor: 'Год. инсоляция',
    winterFactor: 'Зим. инсоляция',
    shadingFactor: 'Риск затенения',
    slopeLabel: 'Рельеф',
    accessLabel: 'Доступность',
  },
  kk: {
    tag: 'Сценарий 04',
    title: 'Күн гүлдері',
    subtitle: 'Күн трекерлері үшін оңтайлы орындарды табу',
    steps: ['Аймақ', 'Параметрлер', 'Нәтижелер'],

    drawTitle: 'Талдау аймағын таңдаңыз',
    drawHint: 'Пішінді таңдап, орналасу нүктелерін іздейтін аймақты сызыңыз.',
    drawModeRect: 'Тіктөртбұрыш',
    drawModeCircle: 'Шеңбер',
    drawModePoly: 'Көпбұрыш',
    drawModeFree: 'Еркін',
    drawBtn: 'Сызуды бастау',
    redrawBtn: 'Қайта сызу',
    clearBtn: 'Тазалау',
    continueBtn: 'Параметрлерге',
    cancelBtn: 'Болдырмау',
    drawingActive: 'Сызу белсенді',
    drawingEsc: 'Esc — болдырмау',

    settingsTitle: 'Параметрлерді баптап, талдауды іске қосыңыз',
    panelTypeLabel: 'Орнату түрі',
    panelFlower: 'Күн гүлі',
    panelGround: 'Жерге орнату',
    panelRooftop: 'Шатырға орнату',
    targetLabel: 'Оңтайландыру мақсаты',
    targetAnnual: 'Жылдық өнімділікті арттыру',
    targetWinter: 'Қысқы өнімділікті арттыру',
    targetBalanced: 'Теңгерімді',
    countLabel: 'Нүктелер саны',
    areaLabel: 'Аудан',
    runBtn: 'Талдауды іске қосу',
    runningBtn: 'Талдануда…',
    backBtn: 'Аймақты өзгерту',

    resultsTitle: 'Талдау аяқталды',
    foundLabel: (n) => `Нүктелер табылды: ${n}`,
    resultsHint: 'Карта маркерін басып, мәліметтерді қараңыз.',
    noResults: 'Нүктелер табылмады. Аймақты үлкейтіп немесе параметрлерді өзгертіп көріңіз.',
    rerunBtn: 'Қайта есептеу',
    newAreaBtn: 'Жаңа аймақ',
    showPointsBtn: 'Картада нүктелерді көрсету',
    hidePointsBtn: 'Картадағы нүктелерді жасыру',
    scoreLabel: 'Балл',
    kwhLabel: 'кВт·сағ/жыл (бол.)',
    annualFactor: 'Жылд. инсоляция',
    winterFactor: 'Қысқы инсоляция',
    shadingFactor: 'Көлеңке қаупі',
    slopeLabel: 'Бедер',
    accessLabel: 'Қолжетімділік',
  },
};

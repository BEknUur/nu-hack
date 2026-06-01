import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getLanguageFromPathname, prefixWithLang } from '@/i18n/langRoutes';

export type Language = 'ru' | 'kk' | 'en';

interface TranslationSet {
  common: {
    appName: string;
    appTagline: string;
    openApp: string;
    startAnalysis: string;
    reviewUseCases: string;
    close: string;
    language: string;
    signOut: string;
  };
  landing: {
    heroTag: string;
    heroTitleTop: string;
    heroTitleBottom: string;
    heroDescription: string;
    metrics: Array<{ value: string; label: string }>;
    heroBlueprintTitle: string;
    heroBlueprintDate: string;
    heroBlueprintCoverage: string;
    heroBlueprintBestSide: string;
    heroBlueprintShift: string;
    heroBlueprintSouth: string;
    timeline: string[];
    coreToolsTag: string;
    coreToolsTitle: string;
    coreToolsDescription: string;
    features: Array<{ title: string; description: string; note: string }>;
    useCasesTag: string;
    useCasesTitle: string;
    useCasesDescription: string;
    useCases: Array<{ title: string; titleEn: string; description: string }>;
    showreelTag: string;
    showreelTitle: string;
    showreelPlaceholderHint: string;
    showreelPlaceholderTitle: string;
    workflowTag: string;
    workflowTitle: string;
    footerUrbanPlanning: string;
    footerSunExposure: string;
    footerCredits: string;
  };
  landingV2: {
    hero: {
      title: string;
      titleAccent: string;
      description: string;
    };
    nav: {
      home: string;
      apartments: string;
      trees: string;
      workers: string;
      solar: string;
    };
    workflows: {
      tag: string;
      title: string;
      titleMuted: string;
      subtitle: string;
    };
    features: Array<{
      title: string;
      description: string;
      tag: string;
    }>;
    openScene: string;
    inDevelopment: string;
    telegram: {
      title: string;
      description: string;
      cta: string;
      features: string[];
    };
    footer: {
      tagline: string;
    };
  };
  map: {
    searchTag: string;
    searchTitle: string;
    searchPlaceholder: string;
    searchHint: string;
    searching: string;
    clearSearchAria: string;
    mapControlsTag: string;
    shadowMapTitle: string;
    date: string;
    analysisMode: string;
    shadows: string;
    exposure: string;
    view: string;
    baseMap: string;
    standard: string;
    satellite: string;
    buildingCoverage: string;
    zoomLabel: string;
    buildingsActive: string;
    zoomToLoad: string;
    timeOfDay: string;
    locationSample: string;
    checkingLight: string;
    inSunlight: string;
    inShadow: string;
    coordinates: string;
    bestSide: string;
    dailySun: string;
    calculatingDailySun: string;
    dailySunHours: string;
    cursorSunHours: string;
    dailySunUnavailable: string;
    dailySunExposureHint: string;
    predictingOrientation: string;
    confidence: string;
    buildingContext: string;
    source: string;
    complex: string;
    address: string;
    loadingDetails: string;
    closeLightDetails: string;
    north: string;
    east: string;
    south: string;
    west: string;
  };
  solarComingSoon: {
    subtitle: string;
    line1: string;
    line2: string | null;
    tagline: string;
  };
}

const STORAGE_KEY = 'kolenke-language';

export const LANGUAGE_LABELS: Record<Language, string> = {
  ru: 'RU',
  kk: 'KK',
  en: 'EN',
};

const translations: Record<Language, TranslationSet> = {
  ru: {
    common: {
      appName: 'Kolenke',
      appTagline: 'карта солнца и тени',
      openApp: 'Открыть приложение',
      startAnalysis: 'Начать анализ',
      reviewUseCases: 'Смотреть сценарии',
      close: 'Закрыть',
      language: 'Язык',
      signOut: 'Выйти',
    },
    landing: {
      heroTag: 'Интеллект инсоляции для Астаны',
      heroTitleTop: 'Планируй с солнцем.',
      heroTitleBottom: 'Решай по тени.',
      heroDescription: 'Рабочая карта для озеленения, квартир, солнечного потенциала и безопасности труда. Выбери локацию, прокрути день и посмотри, как свет реально работает на земле.',
      metrics: [
        { value: '48', label: 'шагов времени в день' },
        { value: '3D', label: 'режима отображения зданий' },
        { value: '24/7', label: 'проверка участка в любой час' },
      ],
      heroBlueprintTitle: 'Сценарий движения солнца',
      heroBlueprintDate: 'Астана · 31 марта',
      heroBlueprintCoverage: 'покрытие',
      heroBlueprintBestSide: 'лучшая сторона',
      heroBlueprintShift: 'смещение тени',
      heroBlueprintSouth: 'Юг',
      timeline: ['06:10 восход', '09:30 дворы', '12:00 пик света', '17:40 смена фасада'],
      coreToolsTag: 'Основные инструменты',
      coreToolsTitle: 'Сделано как рабочий продукт, а не как демо.',
      coreToolsDescription: 'Интерфейс остается собранным и понятным, при этом визуально у него есть характер.',
      features: [
        {
          title: 'Контроль света по минутам',
          description: 'Двигай время и смотри, как тень проходит по фасадам, дворам и рабочим зонам в реальном времени.',
          note: 'Живое воспроизведение теней',
        },
        {
          title: 'Читаемая городская геометрия',
          description: 'Смотри массу и форму зданий в 2D и 3D, не выходя из карты и не переключаясь в другой инструмент.',
          note: '2D и 3D в одном интерфейсе',
        },
        {
          title: 'Анализ для решения',
          description: 'От поиска локации переходи сразу к инсоляции, контексту здания и рекомендации по стороне.',
          note: 'Найти, проверить, решить',
        },
      ],
      useCasesTag: 'Сценарии',
      useCasesTitle: 'Один чистый ролик. Четыре понятных результата.',
      useCasesDescription: 'Этот блок должен работать как короткий product showreel: один сильный видеоблок и рядом четыре сценария без вкладок и лишних попапов.',
      useCases: [
        {
          title: 'Посадка деревьев',
          titleEn: 'Tree planting',
          description: 'Подобрать зоны, которые будут прохладнее летом и сохранят достаточно света зимой.',
        },
        {
          title: 'Анализ квартиры',
          titleEn: 'Apartment analysis',
          description: 'Проверить доступ к солнцу перед покупкой или арендой с учетом ориентации и затенения.',
        },
        {
          title: 'Солнечные цветы',
          titleEn: 'Solar and flowers',
          description: 'Соотнести культуры, цветы или солнечные зоны с реальной дневной инсоляцией участка.',
        },
        {
          title: 'Ротация рабочих',
          titleEn: 'Worker rotation',
          description: 'Планировать более безопасные смены, понимая, где накапливаются жара, солнце и тень.',
        },
      ],
      showreelTag: 'Продуктовый showreel',
      showreelTitle: 'Kolenke в движении',
      showreelPlaceholderHint: '/videos/landing/showreel.mp4',
      showreelPlaceholderTitle: 'Добавь один ролик сюда, и он объяснит весь поток работы.',
      workflowTag: 'Поток работы',
      workflowTitle: 'Короткий путь от карты к действию.',
      footerUrbanPlanning: 'Городское планирование',
      footerSunExposure: 'Инсоляция',
      footerCredits: 'Работает на OpenStreetMap, MapLibre GL и симуляции теней.',
    },
    landingV2: {
      hero: {
        title: 'Солнце',
        // NBSP so WhisperText keeps «в движении.» on one line (no orphan «в»).
        titleAccent: 'в\u00A0движении.',
        description: 'Анализ теней зданий, оптимизация посадки деревьев, планирование смен на открытом воздухе и карта инсоляции — всё на одной городской карте.',
      },
      nav: {
        home: 'Главная',
        apartments: 'Квартиры',
        trees: 'Деревья',
        workers: 'Рабочие',
        solar: 'Солнечные панели',
      },
      workflows: {
        tag: 'Четыре инструмента',
        title: 'Один город.',
        titleMuted: 'Бесконечный свет.',
        subtitle: 'Каждый инструмент работает с симуляцией теней в реальном времени на данных OpenStreetMap. Двигай слайдер — смотри, как дышит город.',
      },
      features: [
        {
          title: 'Анализ квартиры',
          description: 'Проверь инсоляцию, ориентацию и затенение перед принятием решения. Смотри тени фасадов и дворов на протяжении всего дня.',
          tag: 'Анализ',
        },
        {
          title: 'Посадка деревьев',
          description: 'Найди прохладные зоны, которые сохраняют достаточно зимнего света. Двигайся по времени и выбирай, где деревья улучшат комфорт.',
          tag: 'Оптимизация',
        },
        {
          title: 'Ротация рабочих',
          description: 'Выбери рабочую зону, тип задачи, количество смен и посмотри, как команды чередуются между солнцем и тенью в течение дня.',
          tag: 'Планирование',
        },
        {
          title: 'Солнце и цветы',
          description: 'Сопоставь культуры, цветы или солнечные панели с дневным маршрутом света. Быстро сравни потенциальные зоны на одной карте.',
          tag: 'Скоро',
        },
      ],
      openScene: 'Открыть сцену',
      inDevelopment: 'В разработке',
      telegram: {
        title: 'Kolenke — Telegram Bot',
        description: 'AI-помощник по солнечному свету Астаны. Ежедневные брифинги с реальными данными, голосовые сообщения, консультации по нормам.',
        cta: 'Открыть бот',
        features: ['Утренний брифинг 7:00', 'Вечерний брифинг 20:00', 'Голосовые сообщения', 'Нормы СН РК и ТК РК'],
      },
      footer: {
        tagline: 'карта солнца и тени',
      },
    },
    map: {
      searchTag: 'Поиск',
      searchTitle: 'Найти локацию',
      searchPlaceholder: 'Поиск адреса, ЖК или района',
      searchHint: 'Начни с локаций Астаны и сразу переходи в рабочую область карты.',
      searching: 'поиск',
      clearSearchAria: 'Очистить поиск',
      mapControlsTag: 'Управление картой',
      shadowMapTitle: 'Карта теней',
      date: 'Дата',
      analysisMode: 'Режим анализа',
      shadows: 'Тени',
      exposure: 'Инсоляция',
      view: 'Вид',
      baseMap: 'Подложка',
      standard: 'Стандарт',
      satellite: 'Спутник',
      buildingCoverage: 'Покрытие зданий',
      zoomLabel: 'зум',
      buildingsActive: 'Здания OSM активны на этом масштабе.',
      zoomToLoad: 'Приблизь до {{zoom}}+, чтобы загрузить геометрию зданий.',
      timeOfDay: 'Время суток',
      locationSample: 'Точка на карте',
      checkingLight: 'Проверяю свет',
      inSunlight: 'На солнце',
      inShadow: 'В тени',
      coordinates: 'Координаты',
      bestSide: 'Лучшая сторона',
      dailySun: 'Солнце за день',
      calculatingDailySun: 'Считаю часы солнца...',
      dailySunHours: '≈ {{value}} ч солнца',
      cursorSunHours: '{{value}} ч солнца',
      dailySunUnavailable: 'Не удалось считать часы для этой точки.',
      dailySunExposureHint: 'Включи режим «Инсоляция» и кликни точку.',
      predictingOrientation: 'Определяю ориентацию...',
      confidence: 'уверенность {{value}}%',
      buildingContext: 'Контекст здания',
      source: 'Источник',
      complex: 'ЖК',
      address: 'Адрес',
      loadingDetails: 'Загружаю адрес и детали здания...',
      closeLightDetails: 'Закрыть детали света',
      north: 'Север',
      east: 'Восток',
      south: 'Юг',
      west: 'Запад',
    },
    solarComingSoon: {
      subtitle: 'Солнечные панели',
      line1: 'Скоро.',
      line2: null,
      tagline: 'Солнце в\u00A0движении.',
    },
  },
  kk: {
    common: {
      appName: 'Kolenke',
      appTagline: 'күн мен көлеңке картасы',
      openApp: 'Қосымшаны ашу',
      startAnalysis: 'Талдауды бастау',
      reviewUseCases: 'Сценарийлерді көру',
      close: 'Жабу',
      language: 'Тіл',
      signOut: 'Шығу',
    },
    landing: {
      heroTag: 'Астанаға арналған күн жарығы интеллекті',
      heroTitleTop: 'Күнмен жоспарла.',
      heroTitleBottom: 'Көлеңкемен шеш.',
      heroDescription: 'Көгалдандыру, пәтер, күн әлеуеті және еңбек қауіпсіздігіне арналған жұмыс картасы. Орынды таңда, күнді жылжыт және жарықтың жерде қалай жұмыс істейтінін көр.',
      metrics: [
        { value: '48', label: 'күніне уақыт қадамы' },
        { value: '3D', label: 'ғимарат көрсету режимі' },
        { value: '24/7', label: 'учаскені кез келген сағатта тексеру' },
      ],
      heroBlueprintTitle: 'Күн қозғалысы сценарийі',
      heroBlueprintDate: 'Астана · 31 наурыз',
      heroBlueprintCoverage: 'қамту',
      heroBlueprintBestSide: 'үздік бет',
      heroBlueprintShift: 'көлеңке ығысуы',
      heroBlueprintSouth: 'Оңтүстік',
      timeline: ['06:10 күн шығуы', '09:30 аулалар', '12:00 жарық шыңы', '17:40 қасбет ауысуы'],
      coreToolsTag: 'Негізгі құралдар',
      coreToolsTitle: 'Демо емес, нақты өнім сияқты жасалған.',
      coreToolsDescription: 'Интерфейс жинақы әрі түсінікті қалады, сонымен бірге визуалда өзіндік мінезі бар.',
      features: [
        {
          title: 'Жарықты минутпен басқару',
          description: 'Уақытты жылжытып, көлеңкенің қасбеттер, аулалар және жұмыс аймақтары бойынша қалай өтетінін нақты уақытта көр.',
          note: 'Көлеңкенің тірі ойнатылуы',
        },
        {
          title: 'Қаланың анық геометриясы',
          description: 'Ғимараттардың массасы мен формасын 2D және 3D режимінде картаның ішінен қара.',
          note: 'Бір интерфейстегі 2D және 3D',
        },
        {
          title: 'Шешімге арналған талдау',
          description: 'Орнын іздеуден бірден инсоляцияға, ғимарат контекстіне және бет ұсынысына өт.',
          note: 'Тап, тексер, шеш',
        },
      ],
      useCasesTag: 'Сценарийлер',
      useCasesTitle: 'Бір таза видео. Төрт нақты нәтиже.',
      useCasesDescription: 'Бұл блок қысқа product showreel сияқты жұмыс істеуі керек: бір мықты видео беті және қасында төрт сценарий, артық вкладка мен попапсыз.',
      useCases: [
        {
          title: 'Ағаш отырғызу',
          titleEn: 'Tree planting',
          description: 'Жазда салқынырақ, қыста жарығы жеткілікті аймақтарды таңдау.',
        },
        {
          title: 'Пәтерді талдау',
          titleEn: 'Apartment analysis',
          description: 'Сатып алу не жалға алу алдында күн түсуін, бағытын және көлеңкесін тексеру.',
        },
        {
          title: 'Күн және гүлдер',
          titleEn: 'Solar and flowers',
          description: 'Дақылдар, гүлдер не күн аймақтарын жердің нақты инсоляциясымен сәйкестендіру.',
        },
        {
          title: 'Жұмысшылар ротациясы',
          titleEn: 'Worker rotation',
          description: 'Қай жерде күн, көлеңке және ыстық жиналатынын түсініп, қауіпсіз ауысым құру.',
        },
      ],
      showreelTag: 'Өнім showreel-і',
      showreelTitle: 'Kolenke қозғалыста',
      showreelPlaceholderHint: '/videos/landing/showreel.mp4',
      showreelPlaceholderTitle: 'Бір видеоны осында қос, сонда бүкіл жұмыс ағынын түсіндіреді.',
      workflowTag: 'Жұмыс ағымы',
      workflowTitle: 'Картадан әрекетке қысқа жол.',
      footerUrbanPlanning: 'Қалалық жоспарлау',
      footerSunExposure: 'Инсоляция',
      footerCredits: 'OpenStreetMap, MapLibre GL және көлеңке симуляциясы негізінде жұмыс істейді.',
    },
    landingV2: {
      hero: {
        title: 'Күн жарығы',
        titleAccent: 'қозғалыста.',
        description: 'Ғимарат көлеңкелерін талдаңыз, ағаш отырғызуды оңтайландырыңыз, сыртқы жұмыс ауысымдарын жоспарлаңыз — бәрі бір қала картасында.',
      },
      nav: {
        home: 'Басты',
        apartments: 'Пәтерлер',
        trees: 'Ағаштар',
        workers: 'Жұмысшылар',
        solar: 'Күн панельдері',
      },
      workflows: {
        tag: 'Төрт жұмыс ағыны',
        title: 'Бір қала.',
        titleMuted: 'Шексіз жарық.',
        subtitle: 'Әрбір құрал тірі OpenStreetMap деректерінде нақты уақыттағы көлеңке симуляциясын пайдаланады. Уақыт жүргізгішін жылжытыңыз — қаланың тыныс алуын бақылаңыз.',
      },
      features: [
        {
          title: 'Пәтерді талдау',
          description: 'Шешім қабылдамас бұрын инсоляцияны, бағытты және затенениені тексер. Бүкіл күн бойы қасбет пен аулалардың көлеңкелерін бақыла.',
          tag: 'Талдау',
        },
        {
          title: 'Ағаш отырғызу',
          description: 'Жазда салқынырақ, қыста жеткілікті жарығы бар аймақтарды тап. Уақытты жылжытып, ағаштардың комфортты қалай жақсартатынын таңда.',
          tag: 'Оңтайландыру',
        },
        {
          title: 'Жұмысшылар ротациясы',
          description: 'Жұмыс аймағын, тапсырма түрін, экипаж мөлшерін таңда және командалардың күн мен көлеңке арасында қалай ауысатынын алдын ала қарап шық.',
          tag: 'Жоспарлау',
        },
        {
          title: 'Күн және гүлдер',
          description: 'Дақылдар, гүлдер немесе күн панельдерін күндізгі жарық жолымен сәйкестендір. Бір картада потенциалды аймақтарды жылдам салыстыр.',
          tag: 'Жақында',
        },
      ],
      openScene: 'Сахнаны ашу',
      inDevelopment: 'Әзірлеуде',
      telegram: {
        title: 'Kolenke — Telegram Bot',
        description: 'Астананың күн сәулесі бойынша AI-көмекші. Нақты деректермен күнделікті брифингтер, дауыстық хабарламалар, нормалар бойынша кеңестер.',
        cta: 'Ботты ашу',
        features: ['Таңғы брифинг 7:00', 'Кешкі брифинг 20:00', 'Дауыстық хабарламалар', 'СН РК және ТК РК нормалары'],
      },
      footer: {
        tagline: 'күн мен көлеңке картасы',
      },
    },
    map: {
      searchTag: 'Іздеу',
      searchTitle: 'Орнын табу',
      searchPlaceholder: 'Мекенжай, ТК немесе аудан іздеу',
      searchHint: 'Астана локацияларынан бастап, бірден картаның жұмыс аймағына өт.',
      searching: 'іздеу',
      clearSearchAria: 'Іздеуді тазарту',
      mapControlsTag: 'Картаны басқару',
      shadowMapTitle: 'Көлеңке картасы',
      date: 'Күн',
      analysisMode: 'Талдау режимі',
      shadows: 'Көлеңке',
      exposure: 'Инсоляция',
      view: 'Көрініс',
      baseMap: 'Негізгі карта',
      standard: 'Стандарт',
      satellite: 'Спутник',
      buildingCoverage: 'Ғимарат қамтуы',
      zoomLabel: 'зум',
      buildingsActive: 'OSM ғимараттары осы масштабта белсенді.',
      zoomToLoad: 'Ғимарат геометриясын жүктеу үшін {{zoom}}+ дейін жақындат.',
      timeOfDay: 'Тәулік уақыты',
      locationSample: 'Карта нүктесі',
      checkingLight: 'Жарықты тексеру',
      inSunlight: 'Күн астында',
      inShadow: 'Көлеңкеде',
      coordinates: 'Координаттар',
      bestSide: 'Үздік бет',
      dailySun: 'Күндік жарық',
      calculatingDailySun: 'Күн сағаттарын есептеп жатырмын...',
      dailySunHours: '≈ {{value}} сағ күн',
      cursorSunHours: '{{value}} сағ күн',
      dailySunUnavailable: 'Бұл нүкте үшін күн сағатын оқу мүмкін болмады.',
      dailySunExposureHint: '«Инсоляция» режимін қосып, нүктені таңда.',
      predictingOrientation: 'Бағытты анықтап жатырмын...',
      confidence: 'сенімділік {{value}}%',
      buildingContext: 'Ғимарат контексті',
      source: 'Дереккөз',
      complex: 'ТК',
      address: 'Мекенжай',
      loadingDetails: 'Мекенжай мен ғимарат деректерін жүктеп жатырмын...',
      closeLightDetails: 'Жарық деректерін жабу',
      north: 'Солтүстік',
      east: 'Шығыс',
      south: 'Оңтүстік',
      west: 'Батыс',
    },
    solarComingSoon: {
      subtitle: 'Күн панельдері',
      line1: 'Жақында.',
      line2: null,
      tagline: 'Күн қозғалыста.',
    },
  },
  en: {
    common: {
      appName: 'Kolenke',
      appTagline: 'sun and shadow mapping',
      openApp: 'Open app',
      startAnalysis: 'Start analysis',
      reviewUseCases: 'Review use cases',
      close: 'Close',
      language: 'Language',
      signOut: 'Sign out',
    },
    landing: {
      heroTag: 'Urban daylight intelligence for Astana',
      heroTitleTop: 'Plan with sun.',
      heroTitleBottom: 'Decide with shadow.',
      heroDescription: 'A working map for planting, apartments, solar potential, and labor safety. Search a site, move through the day, and read what sunlight actually does on the ground.',
      metrics: [
        { value: '48', label: 'time steps per day' },
        { value: '3D', label: 'building view modes' },
        { value: '24/7', label: 'site checks for any hour' },
      ],
      heroBlueprintTitle: 'Sun path study',
      heroBlueprintDate: 'Astana · March 31',
      heroBlueprintCoverage: 'coverage',
      heroBlueprintBestSide: 'best side',
      heroBlueprintShift: 'shadow shift',
      heroBlueprintSouth: 'South',
      timeline: ['06:10 sunrise', '09:30 courtyards', '12:00 peak light', '17:40 facade shift'],
      coreToolsTag: 'Core tools',
      coreToolsTitle: 'Built like a product tool, not a demo.',
      coreToolsDescription: 'The interface stays clear and work-focused, while the visuals still carry a strong point of view.',
      features: [
        {
          title: 'Minute-level light control',
          description: 'Shift the clock and watch shadows move across facades, courtyards, and work zones in real time.',
          note: 'Live shadow playback',
        },
        {
          title: 'Readable urban geometry',
          description: 'Inspect building massing in 2D or 3D without leaving the map or switching tools.',
          note: '2D and 3D in one view',
        },
        {
          title: 'Decision-ready analysis',
          description: 'Move from location search straight into sun exposure checks, building context, and side recommendations.',
          note: 'Search, inspect, decide',
        },
      ],
      useCasesTag: 'Use cases',
      useCasesTitle: 'One clean video. Four clear outcomes.',
      useCasesDescription: 'This section should work like a short product showreel: one strong video surface and the four scenarios beside it without extra tabs or popups.',
      useCases: [
        {
          title: 'Tree planting',
          titleEn: 'Tree planting',
          description: 'Pick zones that stay cooler in summer and still receive enough light in winter.',
        },
        {
          title: 'Apartment analysis',
          titleEn: 'Apartment analysis',
          description: 'Review sunlight access before buying or renting, with a better sense of orientation and blockage.',
        },
        {
          title: 'Solar and flowers',
          titleEn: 'Solar and flowers',
          description: 'Match solar spots to the actual daily light pattern of the parcel.',
        },
        {
          title: 'Worker rotation',
          titleEn: 'Worker rotation',
          description: 'Plan safer outdoor shifts by understanding where heat, sun, and shade accumulate.',
        },
      ],
      showreelTag: 'Showreel video',
      showreelTitle: 'Kolenke in motion',
      showreelPlaceholderHint: '/videos/landing/showreel.mp4',
      showreelPlaceholderTitle: 'Drop one product video here and let it explain the whole flow.',
      workflowTag: 'Workflow',
      workflowTitle: 'A short path from map view to action.',
      footerUrbanPlanning: 'Urban planning',
      footerSunExposure: 'Sun exposure',
      footerCredits: 'Powered by OpenStreetMap, MapLibre GL, and live shadow simulation.',
    },
    landingV2: {
      hero: {
        title: 'Sunlight',
        titleAccent: 'in\u00A0Motion.',
        description: 'Analyze building shadows, optimize tree placement, plan outdoor shifts, and map sunlight — all on one city map.',
      },
      nav: {
        home: 'Home',
        apartments: 'Apartments',
        trees: 'Trees',
        workers: 'Workers',
        solar: 'Solar Panels',
      },
      workflows: {
        tag: 'Four workflows',
        title: 'One city.',
        titleMuted: 'Endless light.',
        subtitle: 'Each tool runs real-time shadow simulation on live OpenStreetMap data. Move the time slider — watch the city breathe.',
      },
      features: [
        {
          title: 'Apartment Analysis',
          description: 'Review sunlight, orientation, and blockage before you decide. Check facades and courtyard shadows across the full day.',
          tag: 'Analysis',
        },
        {
          title: 'Tree Planting',
          description: 'Find cooler zones that still keep enough winter light. Move through time and choose where trees improve comfort without blocking too much sun.',
          tag: 'Optimization',
        },
        {
          title: 'Worker Rotation',
          description: 'Pick a work zone, choose task type, set crew size, and preview how teams rotate through sun and shade throughout the day.',
          tag: 'Planning',
        },
        {
          title: 'Solar Panel',
          description: 'Match crops, flowers, or solar panels to the daily light path. Compare potential zones quickly on one map.',
          tag: 'Coming soon',
        },
      ],
      openScene: 'Open scene',
      inDevelopment: 'In development',
      telegram: {
        title: 'Kolenke — Telegram Bot',
        description: 'AI sunlight assistant for Astana. Daily briefings with real-time data, voice messages, regulation consultations.',
        cta: 'Open bot',
        features: ['Morning briefing 7:00', 'Evening briefing 20:00', 'Voice messages', 'KZ building & labor norms'],
      },
      footer: {
        tagline: 'sunlight and shadow map',
      },
    },
    map: {
      searchTag: 'Search',
      searchTitle: 'Find a location',
      searchPlaceholder: 'Search address, ЖК, or district',
      searchHint: 'Start with Astana locations and jump directly into the map view.',
      searching: 'searching',
      clearSearchAria: 'Clear search',
      mapControlsTag: 'Map controls',
      shadowMapTitle: 'Shadow map',
      date: 'Date',
      analysisMode: 'Analysis mode',
      shadows: 'Shadows',
      exposure: 'Solar exposure',
      view: 'View',
      baseMap: 'Base map',
      standard: 'Standard',
      satellite: 'Satellite',
      buildingCoverage: 'Building coverage',
      zoomLabel: 'zoom',
      buildingsActive: 'OSM buildings are active for this zoom level.',
      zoomToLoad: 'Zoom to {{zoom}}+ to load building geometry.',
      timeOfDay: 'Time of day',
      locationSample: 'Location sample',
      checkingLight: 'Checking light',
      inSunlight: 'In sunlight',
      inShadow: 'In shadow',
      coordinates: 'Coordinates',
      bestSide: 'Best side',
      dailySun: 'Daily sun',
      calculatingDailySun: 'Calculating sun hours...',
      dailySunHours: '≈ {{value}} h of sun',
      cursorSunHours: '{{value}} hours of sun',
      dailySunUnavailable: 'Could not read sun hours for this point.',
      dailySunExposureHint: 'Switch to Solar exposure mode and click the point.',
      predictingOrientation: 'Predicting orientation...',
      confidence: 'confidence {{value}}%',
      buildingContext: 'Building context',
      source: 'Source',
      complex: 'Complex',
      address: 'Address',
      loadingDetails: 'Loading address and building details...',
      closeLightDetails: 'Close light details',
      north: 'North',
      east: 'East',
      south: 'South',
      west: 'West',
    },
    solarComingSoon: {
      subtitle: 'Solar Panels',
      line1: 'Coming',
      line2: 'Soon.',
      tagline: 'Sunlight in\u00A0Motion.',
    },
  },
};

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  messages: TranslationSet;
  t: (value: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'ru' || stored === 'kk' || stored === 'en') return stored;
  return 'en';
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const fromPath = getLanguageFromPathname(window.location.pathname);
  if (fromPath) return fromPath;
  return getStoredLanguage();
}

function interpolate(value: string, vars?: Record<string, string | number>) {
  if (!vars) return value;
  return Object.entries(vars).reduce(
    (result, [key, replacement]) => result.replaceAll(`{{${key}}}`, String(replacement)),
    value,
  );
}

export function getCurrentLanguage(): Language {
  return getStoredLanguage();
}

export function getPreferredApiLanguage(): string {
  const language = getStoredLanguage();
  if (language === 'kk') return 'kk';
  if (language === 'en') return 'en';
  return 'ru';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    messages: translations[language],
    t: (message, vars) => interpolate(message, vars),
  }), [language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used inside I18nProvider');
  }
  return context;
}

/** Prefix a path with the current UI language (`/en/app/...`). */
export function useLangPath() {
  const { language } = useTranslation();
  return useCallback(
    (path: string) => prefixWithLang(language, path),
    [language],
  );
}

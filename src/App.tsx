import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { 
  Map, Earth, X, ChevronLeft, ChevronRight, List, Volume2, VolumeX, Link as LinkIcon, MapPlus 
} from 'lucide-react';

// --- ИНТЕРФЕЙСЫ ---
interface Region {
  id: string;
  name: string;
  file: string;
  center: [number, number];
  zoom: number;
}

interface ExtentData {
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
}

type Step = 'welcome' | 'setup' | 'map';
type ViewMode = 'normal' | 'lowVision' | 'achromatopsia';
type AgeGroup = 'kids' | 'teens';

// --- ЧТЕНИЕ URL ПРИ ЗАПУСКЕ (ДЛЯ СОХРАНЕНИЯ РЕЖИМА И ОХВАТОВ) ---
const getInitialStateFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  if (data) {
    try {
      const decoded = JSON.parse(atob(data));
      if (decoded.extents && Array.isArray(decoded.extents) && decoded.extents.length > 0) {
        return { step: 'map' as Step, viewMode: decoded.mode as ViewMode, extents: decoded.extents };
      }
    } catch (e) {
      console.error("Ошибка декодирования ссылки:", e);
    }
  }
  return null;
};

const initialUrlState = getInitialStateFromUrl();

// --- КОНСТАНТЫ ---
const REGIONS: Region[] = [
  { id: 'world', name: 'Весь мир', file: '', center: [20, 20], zoom: 1.5 },
  { id: 'africa', name: 'Африка', file: './data/africa.geojson', center: [18.49, 2.05], zoom: 2.59 },
  { id: 'eurasia', name: 'Евразия', file: './data/eurasia.geojson', center: [84.8, 55.6], zoom: 1.67 },
  { id: 'northamerica', name: 'Северная Америка', file: './data/northamerica.geojson', center: [-88.1, 65.3], zoom: 1.68 },
  { id: 'southamerica', name: 'Южная Америка', file: './data/southamerica.geojson', center: [-65.35, -26.24], zoom: 2.66 },
  { id: 'australia', name: 'Австралия', file: './data/australia.geojson', center: [142.84, -26.58], zoom: 3.2 },
];

const NORMAL_PALETTE: any = ['match', ['get', 'Zone'], 'смешанных лесов', '#90EE90', 'широколиственных лесов', '#3CB371', 'лесостепей', '#F0E68C', 'лесотундры', '#D2B48C', 'степей', '#FFF44F', 'степей (пампа)', '#FFF44F', 'полупустынь и пустынь', '#F4A460', 'саванн и редколесий', '#BDB76B', 'жестколистных вечнозеленых лесов и кустарников', '#808000', 'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)', '#808000', 'влажных экваториальных лесов', '#008080', 'переменно-влажных (в том числе муссонных) лесов', '#20B2AA', 'хвойных лесов (тайги)', '#9ACD32', 'тундры', '#DDA0DD', 'тундры и приокеанических лугов', '#D8BFD8', 'арктических пустынь', '#DCDCDC', 'области высотной поясности', '#FFB6C1', 'вечные снега и льды', '#E0FFFF', '#9bf6ff'];

const HIGH_CONTRAST_PALETTE: any = ['match', ['get', 'Zone'], 'арктических пустынь', '#FFFFFF', 'вечные снега и льды', '#B0E0E6', 'влажных экваториальных лесов', '#006400', 'жестколистных вечнозеленых лесов и кустарников', '#8B4513', 'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)', '#8B4513', 'лесостепей', '#DAA520', 'лесотундры', '#D2B48C', 'области высотной поясности', '#800080', 'переменно-влажных (в том числе муссонных) лесов', '#32CD32', 'полупустынь и пустынь', '#FFD700', 'саванн и редколесий', '#E9967A', 'смешанных лесов', '#7CFC00', 'степей', '#F4A460', 'степей (пампа)', '#F4A460', 'тундры', '#4682B4', 'тундры и приокеанических лугов', '#4682B4', 'хвойных лесов (тайги)', '#004d00', 'широколиственных лесов', '#228B22', '#333333'];

const ACHROM_PALETTE: any = ['match', ['get', 'Zone'], 'арктических пустынь', '#FFFFFF', 'вечные снега и льды', '#F8F8F8', 'тундры', '#D3D3D3', 'лесотундры', '#BDBDBD', 'хвойных лесов (тайги)', '#444444', 'смешанных лесов', '#888888', 'широколиственных лесов', '#666666', 'лесостепей', '#E0E0E0', 'степей', '#CCCCCC', 'полупустынь и пустынь', '#F0F0F0', 'саванн и редколесий', '#A9A9A9', 'жестколистных вечнозеленых лесов и кустарников', '#555555', 'переменно-влажных (в том числе муссонных) лесов', '#5D5D5D', 'влажных экваториальных лесов', '#111111', 'области высотной поясности', '#939393', '#888888'];

const ACHROM_PATTERNS: any = [
  'match', ['get', 'Zone'],
  'хвойных лесов (тайги)', 'pattern-taiga',
  'широколиственных лесов', 'pattern-broadleaf',
  'смешанных лесов', 'pattern-mixed',
  'степей', 'pattern-steppe',
  'степей (пампа)', 'pattern-steppe',
  'лесостепей', 'pattern-lesostep',
  'полупустынь и пустынь', 'pattern-desert',
  'саванн и редколесий', 'pattern-savanna',
  'влажных экваториальных лесов', 'pattern-jungle',
  'переменно-влажных (в том числе муссонных) лесов', 'pattern-peremjungle',
  'тундры', 'pattern-tundra',
  'лесотундры', 'pattern-lesotundra',
  'тундры и приокеанических лугов', 'pattern-tundra',
  'арктических пустынь', 'pattern-snow',
  'вечные снега и льды', 'pattern-snow',
  'области высотной поясности', 'pattern-mountains',
  'жестколистных вечнозеленых лесов и кустарников', 'pattern-shrubs',
  'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)', 'pattern-shrubs',
  'none'
];

const ANIMAL_ICONS: any = [
  'match', ['get', 'Zone'],
  'арктических пустынь', 'icon-polar-bear',
  'вечные снега и льды', 'icon-penguin',
  'тундры', 'icon-reindeer',
  'лесотундры', 'icon-reindeer',
  'тундры и приокеанических лугов', 'icon-reindeer',
  'хвойных лесов (тайги)', 'icon-brown-bear',
  'смешанных лесов', 'icon-wolf',
  'широколиственных лесов', 'icon-fox',
  'лесостепей', 'icon-suslik',
  'степей', 'icon-suslik',
  'степей (пампа)', 'icon-bron',
  'полупустынь и пустынь', 'icon-camel',
  'саванн и редколесий', 'icon-lion',
  'влажных экваториальных лесов', 'icon-monkey',
  'переменно-влажных (в том числе муссонных) лесов', 'icon-monkey',
  'области высотной поясности', 'icon-kozel',
  'icon-default'
];

const LEGEND_ITEMS = [
  { name: 'Смешанные леса', color: '#90EE90' },
  { name: 'Широколиственные леса', color: '#3CB371' },
  { name: 'Лесостепи', color: '#F0E68C' },
  { name: 'Лесотундра', color: '#D2B48C' },
  { name: 'Степи', color: '#FFF44F' },
  { name: 'Полупустыни и пустыни', color: '#F4A460' },
  { name: 'Саванны и редколесья', color: '#BDB76B' },
  { name: 'Жестколистные леса', color: '#808000' },
  { name: 'Влажные экваториальные леса', color: '#008080' },
  { name: 'Переменно-влажные леса', color: '#20B2AA' },
  { name: 'Хвойные леса (тайга)', color: '#9ACD32' },
  { name: 'Тундра', color: '#DDA0DD' },
  { name: 'Арктические пустыни', color: '#DCDCDC' },
  { name: 'Области высотной поясности', color: '#FFB6C1' },
  { name: 'Вечные снега и льды', color: '#E0FFFF' }
];

// --- КРАТКИЕ ГЕОГРАФИЧЕСКИЕ ОПИСАНИЯ ЗОН ДЛЯ СТАРШЕКЛАССНИКОВ ---
const ZONE_DESCRIPTIONS: Record<string, string> = {
  'смешанных лесов': 'Природная зона умеренного пояса, характеризующаяся совместным произрастанием хвойных и мелколиственных древесных пород на дерново-подзолистых почвах.',
  'широколиственных лесов': 'Зона умеренного климата с преобладанием листопадных широколиственных деревьев (дуб, липа, бук). Почвы преимущественно серые лесные.',
  'лесостепей': 'Переходная природная зона умеренного пояса, отличающаяся естественным чередованием массивов лесов со степными участками.',
  'лесотундры': 'Субарктическая переходная зона, где наряду со мхами, лишайниками и кустарниками встречаются редколесья и низкорослые искривленные деревья.',
  'степей': 'Травянистая равнинная биома умеренного и субтропического поясов с засушливым климатом и слабовыраженным древесным покровом на плодородных черноземах.',
  'степей (пампа)': 'Субтропическая степная равнина в Южной Америке с густым травяным покровом, развитая в условиях мягкого, относительно влажного климата.',
  'полупустынь и пустынь': 'Регионы с крайне засушливым (аридным) климатом, скудной разреженной растительностью, резкими суточными колебаниями температур и дефицитом влаги.',
  'саванн и редколесий': 'Тропическая зона с четко выраженным делением года на сухой и влажный сезоны, занятая высокими злаками с одиночно стоящими деревьями (баобабы, акации).',
  'жестколистных вечнозеленых лесов и кустарников': 'Субтробический биом, адаптированный к сухому жаркому лету и мягкой влажной зиме. Листья растений имеют плотную кожистую структуру для экономии влаги.',
  'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)': 'Классический средиземноморский субтропический биом с вечнозелеными кустарниками (маквис) и жестколистными лесами (каменный дуб, маслины).',
  'влажных экваториальных лесов': 'Биом постоянного жаркого и влажного экваториального климата с колоссальным биоразнообразием, многоярусной структурой лесного полога и отсутствием сезонности.',
  'переменно-влажных (в том числе муссонных) лесов': 'Тропическая зона, где режим осадков определяется сезонными ветрами (муссонами). Деревья могут сбрасывать листву во время сухого периода.',
  'хвойных лесов (тайги)': 'Самая обширная лесная зона планеты, расположенная в северных широтах умеренного пояса. Преобладают темнохвойные и светлохвойные леса на подзолистых почвах.',
  'тундры': 'Безлесный субарктический биом, развивающийся в условиях вечной мерзлоты, сильных ветров и короткого вегетационного периода. Преобладают мхи, лишайники и карликовые кустарники.',
  'тундры и приокеанических лугов': 'Специфическая приморская разновидность субарктического биома, где благодаря влажному морскому климату развиваются богатые разнотравные луга.',
  'арктических пустынь': 'Приполярная природная зона, практически полностью лишенная растительности из-за экстремально низких температур, обилия ледников и каменистых россыпей.',
  'области высотной поясности': 'Природные комплексы, закономерно сменяющие друг друга в горах от подножия к вершинам по мере падения температуры воздуха и изменения влажности.',
  'вечные снега и льды': 'Полярные и высокогорные регионы, постоянно покрытые ледниками и фирновым снегом, где процессы таяния уступают процессам аккумуляции твердых осадков.'
};

// Исправленная функция-словарь для безошибочного получения цвета зоны
const getZoneColor = (zoneName: string | null): string => {
  if (!zoneName) return '#ffffff';
  const lower = zoneName.toLowerCase().trim();

  switch (lower) {
    case 'смешанных лесов': return '#90EE90';
    case 'широколиственных лесов': return '#3CB371';
    case 'лесостепей': return '#F0E68C';
    case 'лесотундры': return '#D2B48C';
    case 'степей':
    case 'степей (пампа)': return '#FFF44F';
    case 'полупустынь и пустынь': return '#F4A460';
    case 'саванн и редколесий': return '#BDB76B';
    case 'жестколистных вечнозеленых лесов и кустарников':
    case 'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)': return '#808000';
    case 'влажных экваториальных лесов': return '#008080';
    case 'переменно-влажных (в том числе муссонных) лесов': return '#20B2AA';
    case 'хвойных лесов (тайги)': return '#9ACD32';
    case 'тундры':
    case 'тундры и приокеанических лугов': return '#DDA0DD';
    case 'арктических пустынь': return '#DCDCDC';
    case 'области высотной поясности': return '#FFB6C1';
    case 'вечные снега и льды': return '#E0FFFF';
    default: return '#ffffff';
  }
};

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(initialUrlState ? initialUrlState.step : 'welcome');
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrlState ? initialUrlState.viewMode : 'normal');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('teens'); 

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [currentRegionIdx, setCurrentRegionIdx] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [isExtentMode, setIsExtentMode] = useState(false);
  const [savedExtents, setSavedExtents] = useState<ExtentData[]>(initialUrlState ? initialUrlState.extents : []);
  const [isViewOnly] = useState(!!initialUrlState);
  const [viewExtentIdx, setViewExtentIdx] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<maplibregl.Point | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const viewModeRef = useRef(viewMode);
  const regionIdxRef = useRef(currentRegionIdx);
  const isMutedRef = useRef(isMuted);

  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { regionIdxRef.current = currentRegionIdx; }, [currentRegionIdx]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // --- ЗВУКИ ---
  const stopAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    audioRef.current = null;
  };

  const playClickSound = () => {
    if (!isMutedRef.current) new Audio('./music/click.mp3').play().catch(() => {});
  };

  const playZoneSound = useCallback((name: string) => {
    stopAudio();
    if (isMutedRef.current || !name) return;

    const lowerName = name.trim().toLowerCase();
    let fileName = (lowerName.startsWith('зона') || 
                    lowerName.startsWith('вечные') || 
                    lowerName.startsWith('области')) 
      ? name 
      : `Зона ${name}`;

    const audio = new Audio(`./music/${fileName}.mp3`);
    audio.play().catch(err => console.error("Audio error:", fileName, err));
    audioRef.current = audio;
  }, []);

  const handleConfirmSetup = () => {
    playClickSound();
    setStep('map');
    setProjection(viewMode !== 'normal' ? 'mercator' : 'globe');
  };

  const handleBackToSetup = () => {
    playClickSound();
    stopAudio();
    setCurrentRegionIdx(0); 
    if (mapRef.current) {
      REGIONS.forEach(reg => {
        if (reg.id !== 'world' && mapRef.current?.getLayer(`${reg.id}-fill`)) {
          mapRef.current.setLayoutProperty(`${reg.id}-fill`, 'visibility', 'none');
          mapRef.current.setLayoutProperty(`${reg.id}-outline`, 'visibility', 'none');
        }
      });
      if (mapRef.current.getLayer('zones-fill')) {
          mapRef.current.setLayoutProperty('zones-fill', 'visibility', 'visible');
      }
      mapRef.current.flyTo({ center: REGIONS[0].center, zoom: REGIONS[0].zoom });
    }
    setStep('setup');
  };

  const applyMode = (m: maplibregl.Map, mode: ViewMode, currentAge: AgeGroup) => {
    try {
      if (!m.getLayer('zones-fill')) return;
  
      m.setLayoutProperty('zones-fill', 'visibility', 'none');
      m.setLayoutProperty('zones-achrom-bg', 'visibility', 'none');
      m.setLayoutProperty('zones-achrom-pattern', 'visibility', 'none');
      m.setLayoutProperty('zones-achrom-outline', 'visibility', 'none');
      m.setLayoutProperty('zones-outline-all', 'visibility', 'none');
      
      if (m.getLayer('zones-animals')) {
        m.setLayoutProperty('zones-animals', 'visibility', 'none');
      }
  
      if (mode === 'lowVision') {
        m.setLayoutProperty('zones-fill', 'visibility', 'visible');
        m.setPaintProperty('zones-fill', 'fill-color', HIGH_CONTRAST_PALETTE);
        m.setPaintProperty('zones-fill', 'fill-opacity', 1.0);
        m.setLayoutProperty('zones-outline-all', 'visibility', 'visible');
      } else if (mode === 'achromatopsia') {
        m.setLayoutProperty('zones-achrom-bg', 'visibility', 'visible');
        m.setLayoutProperty('zones-achrom-pattern', 'visibility', 'visible');
        m.setLayoutProperty('zones-achrom-outline', 'visibility', 'visible');
      } else {
        m.setLayoutProperty('zones-fill', 'visibility', 'visible');
        m.setPaintProperty('zones-fill', 'fill-color', NORMAL_PALETTE);
        m.setPaintProperty('zones-fill', 'fill-opacity', 0.7);
        
        if (currentAge === 'kids' && m.getLayer('zones-animals')) {
          m.setLayoutProperty('zones-animals', 'visibility', 'visible');
          if (!selectedZone) {
            m.setFilter('zones-animals', ['==', ['get', 'Zone'], 'Скрыто_при_запуске']);
          }
        }
      }
    } catch (e) {
      console.warn("Ошибка в applyMode", e);
    }
  };

  // --- ЕДИНОРАЗОВАЯ ИНИЦИАЛИЗАЦИЯ КАРТЫ ---
  useEffect(() => {
    if (step !== 'map' || !mapContainer.current || mapRef.current) return;

    const startBg = viewModeRef.current === 'lowVision' ? '#000' : (viewModeRef.current === 'achromatopsia' ? '#fff' : '#a2d2ff');

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: { 
        version: 8, sources: {}, 
        layers: [{ 
          id: 'background', type: 'background', 
          paint: { 'background-color': startBg } 
        }] 
      },
      center: REGIONS[0].center, 
      zoom: REGIONS[0].zoom,
      interactive: !isViewOnly,
      attributionControl: false,
      hash: true
    } as any);

    m.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: '© Галиаскарова К.Н. МГУ'
    }));

    mapRef.current = m;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const vMode = viewModeRef.current;
      const rIdx = regionIdxRef.current;
      const regionId = REGIONS[rIdx].id;
      
      const interactiveLayers = regionId === 'world' 
        ? ['zones-fill', 'zones-achrom-bg'] 
        : [`${regionId}-fill`];

      const features = m.queryRenderedFeatures(e.point, { layers: interactiveLayers });

      if (features.length > 0) {
        const zoneName = features[0].properties?.Zone as string;
        setSelectedZone(zoneName);
        playZoneSound(zoneName);

        m.setLayoutProperty('zones-shaded', 'visibility', 'visible');
        m.setFilter('zones-shaded', ['!=', ['get', 'Zone'], zoneName]);

        if (m.getLayer('zones-animals')) {
          m.setFilter('zones-animals', ['==', ['get', 'Zone'], zoneName]);
        }

        if (vMode === 'lowVision') {
          const activeLayer = regionId === 'world' ? 'zones-fill' : `${regionId}-fill`;
          m.setFilter(activeLayer, ['==', ['get', 'Zone'], zoneName]);
        } else if (vMode === 'achromatopsia') {
          m.setFilter('zones-achrom-bg', ['==', ['get', 'Zone'], zoneName]);
          m.setFilter('zones-achrom-pattern', ['==', ['get', 'Zone'], zoneName]);
        } else {
          m.setFilter('zones-fill', ['==', ['get', 'Zone'], zoneName]);
        }
      } else {
        setSelectedZone(null);
        stopAudio();
        m.setFilter('zones-fill', null);
        m.setFilter('zones-achrom-bg', null);
        m.setFilter('zones-achrom-pattern', null);
        
        if (m.getLayer('zones-animals')) {
          m.setFilter('zones-animals', ['==', ['get', 'Zone'], 'Скрыто_при_запуске']);
        }
        
        REGIONS.forEach(reg => {
          if (reg.id !== 'world' && m.getLayer(`${reg.id}-fill`)) {
            m.setFilter(`${reg.id}-fill`, null);
          }
        });
        
        m.setLayoutProperty('zones-shaded', 'visibility', 'none');
      }
    };

    m.on('load', () => {
      const patterns = [
        'taiga', 'broadleaf', 'mixed', 'steppe', 'lesostep', 'desert', 'savanna', 'peremjungle', 
        'jungle', 'tundra', 'lesotundra', 'snow', 'mountains', 'shrubs'
      ];

      patterns.forEach(name => {
        m.loadImage(`./patterns/${name}.png`)
          .then(response => {
            if (response && response.data && !m.hasImage(`pattern-${name}`)) {
              m.addImage(`pattern-${name}`, response.data, { pixelRatio: 5 });
            }
          })
          .catch(error => {
            console.error(`Ошибка загрузки паттерна ${name}.png:`, error);
          });
      });

      const animals = [
        'polar-bear', 'penguin', 'reindeer', 'brown-bear', 
        'wolf', 'fox', 'suslik', 'bron', 'camel', 
        'lion', 'monkey', 'kozel', 'default'
      ];

      animals.forEach(name => {
        m.loadImage(`./animals/${name}.png`)
          .then(response => {
            if (response && response.data && !m.hasImage(`icon-${name}`)) {
              m.addImage(`icon-${name}`, response.data, { pixelRatio: 1 }); 
            }
          })
          .catch(err => console.warn(`Ошибка иконки животного ${name}:`, err));
      });

      m.addSource('zones-data', { type: 'geojson', data: './data/mir.geojson' });

      REGIONS.forEach(reg => {
        if (reg.id === 'world') return;
        m.addSource(`${reg.id}-source`, { type: 'geojson', data: reg.file });
      });

      m.addLayer({ id: 'zones-shaded', type: 'fill', source: 'zones-data', layout: { visibility: 'none' }, paint: { 'fill-color': '#000000', 'fill-opacity': 0.6 } });
      m.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones-data', paint: { 'fill-color': NORMAL_PALETTE, 'fill-opacity': 0.7 } });
      m.addLayer({ id: 'zones-outline-all', type: 'line', source: 'zones-data', layout: { visibility: 'none' }, paint: { 'line-color': '#ffffff', 'line-width': 1.5 } });
      m.addLayer({ id: 'zones-achrom-bg', type: 'fill', source: 'zones-data', layout: { visibility: 'none' }, paint: { 'fill-color': ACHROM_PALETTE, 'fill-opacity': 1.0 } });
      m.addLayer({ id: 'zones-achrom-pattern', type: 'fill', source: 'zones-data', layout: { visibility: 'none' }, paint: { 'fill-pattern': ACHROM_PATTERNS, 'fill-opacity': 0.6 } });
      m.addLayer({ id: 'zones-achrom-outline', type: 'line', source: 'zones-data', layout: { visibility: 'none' }, paint: { 'line-color': '#000000', 'line-width': 0.7 } });

      m.addLayer({
        id: 'zones-animals',
        type: 'symbol',
        source: 'zones-data',
        filter: ['==', ['get', 'Zone'], 'Скрыто_при_запуске'],
        layout: {
          'visibility': 'none', 
          'icon-image': ANIMAL_ICONS, 
          'icon-size': 0.1, 
          'icon-allow-overlap': true, 
          'icon-ignore-placement': true, 
          'symbol-placement': 'point'
        },
        paint: {
          'icon-opacity': 1.0
        }
      });

      REGIONS.forEach(reg => {
        if (reg.id === 'world') return;
        m.addLayer({ id: `${reg.id}-fill`, type: 'fill', source: `${reg.id}-source`, layout: { visibility: 'none' }, paint: { 'fill-color': HIGH_CONTRAST_PALETTE, 'fill-opacity': 1.0 } });
        m.addLayer({ id: `${reg.id}-outline`, type: 'line', source: `${reg.id}-source`, layout: { visibility: 'none' }, paint: { 'line-color': '#ffffff', 'line-width': 2 } });
      });

      applyMode(m, viewModeRef.current, ageGroup);

      if (isViewOnly && savedExtents.length > 0) {
        m.fitBounds(savedExtents[0].bounds, { padding: 50 });
      }

      m.on('click', handleMapClick);
    });

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {
        console.warn("Ошибка при удалении карты", e);
      }
    };
  }, [step, isViewOnly, playZoneSound, ageGroup]);

  // --- РЕАКЦИЯ НА ИЗМЕНЕНИЕ РЕЖИМА ЗРЕНИЯ И ВОЗРАСТА ---
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const updateMapStyle = () => {
      try {
        const bgColor = viewMode === 'lowVision' ? '#000' : (viewMode === 'achromatopsia' ? '#fff' : '#a2d2ff');
        m.setPaintProperty('background', 'background-color', bgColor);

        applyMode(m, viewMode, ageGroup);
        
        setSelectedZone(null);
        m.setFilter('zones-fill', null);
        m.setFilter('zones-achrom-bg', null);
        m.setFilter('zones-achrom-pattern', null);
        if (m.getLayer('zones-animals')) {
          m.setFilter('zones-animals', ['==', ['get', 'Zone'], 'Скрыто_при_запуске']);
        }

        REGIONS.forEach(reg => {
          if (reg.id !== 'world' && m.getLayer(`${reg.id}-fill`)) {
            m.setFilter(`${reg.id}-fill`, null);
          }
        });
        m.setLayoutProperty('zones-shaded', 'visibility', 'none');
      } catch(e) {
        console.warn("Стиль обновлен с задержкой", e);
      }
    };

    if (m.isStyleLoaded()) {
      updateMapStyle();
    } else {
      m.once('styledata', updateMapStyle);
    }
  }, [viewMode, ageGroup]); 

  // --- РЕАКЦИЯ НА ИЗМЕНЕНИЕ ПРОЕКЦИИ ---
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    
    const updateProj = () => {
      try {
        if ((m as any).setProjection) {
          (m as any).setProjection({ type: projection });
        }
      } catch(e) {}
    };

    if (m.isStyleLoaded()) {
      updateProj();
    } else {
      m.once('styledata', updateProj);
    }
  }, [projection]);

  // --- ЛОГИКА ЭКСТЕНТОВ ---
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !isExtentMode) return;

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      m.dragPan.disable();
      setIsDrawing(true);
      setStartPoint(e.point);
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing || !startPoint) return;
      setBox({
        x: Math.min(startPoint.x, e.point.x),
        y: Math.min(startPoint.y, e.point.y),
        w: Math.abs(startPoint.x - e.point.x),
        h: Math.abs(startPoint.y - e.point.y)
      });
    };

    const onMouseUp = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing || !startPoint) return;
      const bounds = new maplibregl.LngLatBounds(m.unproject(startPoint), m.unproject(e.point));
      const newExtent: ExtentData = {
        center: m.getCenter().toArray() as [number, number],
        zoom: m.getZoom(),
        bounds: [bounds.getSouthWest().toArray() as [number, number], bounds.getNorthEast().toArray() as [number, number]]
      };
      setSavedExtents(prev => {
        const updated = [...prev, newExtent];
        if (updated.length >= 3) setIsExtentMode(false);
        return updated;
      });
      setIsDrawing(false);
      setBox(null);
      m.dragPan.enable();
    };

    m.on('mousedown', onMouseDown);
    m.on('mousemove', onMouseMove);
    m.on('mouseup', onMouseUp);

    return () => {
      m.off('mousedown', onMouseDown);
      m.off('mousemove', onMouseMove);
      m.off('mouseup', onMouseUp);
    };
  }, [isExtentMode, isDrawing, startPoint]);

  // --- НАВИГАЦИЯ ---
  const changeRegion = (direction: 'next' | 'prev') => {
    const m = mapRef.current;
    if (!m) return;

    const currentId = REGIONS[currentRegionIdx].id;
    if (currentId !== 'world') {
      m.setLayoutProperty(`${currentId}-fill`, 'visibility', 'none');
      m.setLayoutProperty(`${currentId}-outline`, 'visibility', 'none');
    } else {
      m.setLayoutProperty('zones-fill', 'visibility', 'none');
    }

    let newIdx = direction === 'next' ? currentRegionIdx + 1 : currentRegionIdx - 1;
    if (newIdx >= REGIONS.length) newIdx = 0;
    if (newIdx < 0) newIdx = REGIONS.length - 1;

    const nextReg = REGIONS[newIdx];
    if (nextReg.id === 'world') {
      m.setLayoutProperty('zones-fill', 'visibility', 'visible');
    } else {
      m.setLayoutProperty(`${nextReg.id}-fill`, 'visibility', 'visible');
      m.setLayoutProperty(`${nextReg.id}-outline`, 'visibility', 'visible');
    }

    m.flyTo({ center: nextReg.center, zoom: nextReg.zoom, speed: 1.0, essential: true });
    setCurrentRegionIdx(newIdx);
    setSelectedZone(null);
  };

  const navigateExtent = (dir: 'next' | 'prev') => {
    let newIdx = dir === 'next' ? viewExtentIdx + 1 : viewExtentIdx - 1;
    if (newIdx < 0) newIdx = savedExtents.length - 1;
    if (newIdx >= savedExtents.length) newIdx = 0;
    setViewExtentIdx(newIdx);
    mapRef.current?.fitBounds(savedExtents[newIdx].bounds, { padding: 60, speed: 1.2 });
  };

  const generateShareLink = () => {
    const shareData = {
      extents: savedExtents,
      mode: viewMode
    };
    const data = btoa(JSON.stringify(shareData));
    const link = `${window.location.origin}${window.location.pathname}?data=${data}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка скопирована в буфер обмена!");
  };

  const getControlBtnStyle = () => ({
    backgroundColor: projection === 'mercator' ? '#ef4444' : '#3b82f6'
  });

  const arrowColorClass = projection === 'globe' ? 'dark' : 'light';

  if (step === 'welcome') {
    return (
      <div className="welcome-screen">
        <div className="welcome-overlay">
          <div className="welcome-content-container">
            <img src="./data/image_132.png" alt="Фон" className="welcome-image" />
            <div className="welcome-text-block">
              <h1 className="welcome-title">Добро пожаловать!</h1>
              <div className="welcome-description-box">
                <p>Наш образовательный ресурс представляет собой интерактивную платформу, 
                  специально разработанную для изучения природных зон мира учениками с нарушениями зрения. 
                  С помощью доступных веб-карт вы можете самостоятельно исследовать особенности каждого региона, 
                  используя адаптированные визуальные элементы и звуковое сопровождение. 
                  Для начала работы выберите интересующий вас режим на следующей странице, после чего вы сможете 
                  перемещаться по карте, активировать информационные подсказки и изменять масштаб отображения 
                  для детального изучения каждого региона в максимально комфортном для вас темпе.
                </p>
              </div>
            </div>
          </div>
          <button className="welcome-start-btn" onClick={() => { playClickSound(); setStep('setup'); }}>ДАЛЕЕ</button>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="setup-screen">
        <button className="back-link-top" onClick={() => setStep('welcome')}>← Назад</button>
        <div className="setup-container">
          <div className="setup-section">
            <h2 className="setup-label">Выбрать состояние зрения</h2>
            <div className="setup-row">
              <button className={`setup-btn ${viewMode === 'normal' ? 'active' : ''}`} onClick={() => setViewMode('normal')}>Обычное зрение</button>
              <button className={`setup-btn ${viewMode === 'lowVision' ? 'active' : ''}`} onClick={() => setViewMode('lowVision')}>Слабовидение</button>
              <button className={`setup-btn ${viewMode === 'achromatopsia' ? 'active' : ''}`} onClick={() => setViewMode('achromatopsia')}>Дальтонизм</button>
            </div>
          </div>
          <div className="setup-section">
            <h2 className="setup-label">Выбрать возраст</h2>
            <div className="setup-row">
              <button className={`setup-btn ${ageGroup === 'kids' ? 'active' : ''}`} onClick={() => setAgeGroup('kids')}>Дошкольники и младшие классы</button>
              <button className={`setup-btn ${ageGroup === 'teens' ? 'active' : ''}`} onClick={() => setAgeGroup('teens')}>Средняя школа и старше</button>
            </div>
          </div>
          <button className="confirm-setup-btn" onClick={handleConfirmSetup}>ДАЛЕЕ</button>
        </div>
      </div>
    );
  }

  const modeLabels: Record<ViewMode, string> = {
    normal: 'Обычное зрение',
    lowVision: 'Слабовидение',
    achromatopsia: 'Дальтонизм'
  };

  return (
    <main className={`app-container ${viewMode !== 'normal' ? 'large-cursor' : ''}`}>
      <div ref={mapContainer} className="map-container" />

      <div style={{
        position: 'absolute', bottom: '15px', left: '15px', 
        background: 'rgba(255, 255, 255, 0.95)', padding: '8px 12px', 
        fontSize: '15px', zIndex: 10, borderRadius: '8px',
        color: '#000', border: '2px solid #333',
        fontWeight: 600, pointerEvents: 'none'
      }}>
        Режим: {modeLabels[viewMode]}
      </div>

      {box && (
        <div style={{
          position: 'absolute',
          border: '3px dashed white',
          backgroundColor: 'rgba(255,255,255,0.2)',
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          pointerEvents: 'none',
          zIndex: 1000
        }} />
      )}

      {isExtentMode && (
        <div className="extent-recording-overlay" style={{ pointerEvents: 'none' }}>
          <div className="extent-plaque" style={{ pointerEvents: 'auto' }}>
            <div className="plaque-main">{savedExtents.length < 3 ? "Добавить охват" : "Получить ссылку"}</div>
            <div className="plaque-counter">Зон сохранено: {savedExtents.length} / 3</div>
          </div>
          <button className="extent-cancel-btn" style={{ pointerEvents: 'auto' }} title="Отменить создание маршрута" onClick={() => { setIsExtentMode(false); setSavedExtents([]); setBox(null); }}>
            <X size={28} />
          </button>
        </div>
      )}

      {!isExtentMode && !isViewOnly && (
        <>
          {(viewMode === 'normal' || viewMode === 'achromatopsia') && ageGroup === 'teens' && (
            <>
              <button className="control-btn legend-toggle-btn" style={getControlBtnStyle()} title={isLegendOpen ? "Закрыть легенду" : "Открыть легенду карты"} onClick={() => setIsLegendOpen(!isLegendOpen)}>
                <List size={24} />
              </button>
              {isLegendOpen && (
                <section className="legend-panel">
                  <div className="legend-header">
                    <h3>Зоны</h3>
                    <button title="Закрыть легенду" onClick={() => setIsLegendOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
                  </div>
                  <div className="legend-scroll">
                    {LEGEND_ITEMS.map((item, i) => (
                      <div key={i} className="legend-row">
                        <span className="legend-color" style={{background: viewMode === 'achromatopsia' ? '#888888' : item.color}} />
                        <span className="legend-label">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {viewMode === 'lowVision' && (
            <nav>
              <button className={`nav-arrow left ${arrowColorClass}`} title="Перейти к предыдущему материку" onClick={() => changeRegion('prev')}>
                <ChevronLeft size={100} />
              </button>
              <button className={`nav-arrow right ${arrowColorClass}`} title="Перейти к следующему материку" onClick={() => changeRegion('next')}>
                <ChevronRight size={100} />
              </button>
              <div className={`region-indicator ${arrowColorClass}`}>
                {REGIONS[currentRegionIdx].name}
              </div>
            </nav>
          )}

          {/* ИНКЛЮЗИВНАЯ АДАПТИВНАЯ СИСТЕМА ИНФОРМАЦИОННЫХ ПЛАШЕК (ПРИ КЛИКЕ НА ЗОНУ) */}
          {selectedZone && (
            <div className="zone-info-panel-container">
              {viewMode === 'normal' && ageGroup === 'teens' ? (
                /* 1. ОБЫЧНЫЙ РЕЖИМ (СТАРШЕКЛАССНИКИ): Продвинутая плашка с описанием и цветом зоны */
                <section 
                  className="zone-advanced-card"
                  style={{
                    backgroundColor: getZoneColor(selectedZone),
                    border: '3px solid #000000',
                    color: '#000000'
                  }}
                >
                  <h2 className="zone-card-title">{selectedZone}</h2>
                  <p className="zone-card-description">
                    {ZONE_DESCRIPTIONS[selectedZone.trim().toLowerCase()] || 'Описание для данной природной зоны подготавливается.'}
                  </p>
                </section>
              ) : viewMode === 'normal' && ageGroup === 'kids' ? (
                /* 2. ОБЫЧНЫЙ РЕЖИМ (ДОШКОЛЬНИКИ): Компактная плашка с названием, подстраивающаяся под цвет зоны */
                <div 
                  className="zone-title-overlay"
                  style={{
                    backgroundColor: getZoneColor(selectedZone),
                    border: '3px solid #000000',
                    color: '#000000',
                    position: 'static',
                    transform: 'none'
                  }}
                >
                  {selectedZone}
                </div>
              ) : viewMode === 'lowVision' ? (
                /* 3. СЛАБОВИДЕНИЕ: Крупная желтая плашка внизу экрана по центру с увеличенным черным текстом */
                <div 
                  className="zone-title-overlay-lowvision"
                  style={{
                    position: 'absolute',
                    bottom: '90px', // приподнята, чтобы не перекрывать нижнюю плашку "Режим: ..."
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#ffeb3b',
                    border: '4px solid #000000',
                    color: '#000000',
                    padding: '12px 30px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                    zIndex: 1001,
                    textAlign: 'center'
                  }}
                >
                  {selectedZone}
                </div>
              ) : viewMode === 'achromatopsia' ? (
                /* 4. ДАЛЬТОНИЗМ: Нейтральная серая плашка с черным текстом и обводкой */
                <div 
                  className="zone-title-overlay"
                  style={{
                    backgroundColor: '#e0e0e0',
                    border: '3px solid #000000',
                    color: '#000000',
                    position: 'static',
                    transform: 'none'
                  }}
                >
                  {selectedZone}
                </div>
              ) : (
                /* Резервный дефолтный вариант */
                <div className="zone-title-overlay">{selectedZone}</div>
              )}
            </div>
          )}

          <div className="controls-stack" style={{ 
            transform: viewMode === 'lowVision' ? 'scale(1.15)' : 'none', 
            transformOrigin: 'bottom right',
            bottom: viewMode === 'lowVision' ? '10px' : '30px',
            gap: viewMode === 'lowVision' ? '8px' : '15px'
          }}>
            
            {savedExtents.length < 3 ? (
              <button className="control-btn" style={getControlBtnStyle()} title="Создать учебный маршрут" onClick={() => { playClickSound(); setSavedExtents([]); setIsExtentMode(true); }}>
                <MapPlus size={32} />
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: viewMode === 'lowVision' ? '8px' : '15px' }}>
                <button className="control-btn" style={{ backgroundColor: '#22c55e' }} title="Поделиться результатом" onClick={() => { playClickSound(); generateShareLink(); }}>
                  <LinkIcon size={32} />
                </button>
                <button className="control-btn" style={{ backgroundColor: '#ef4444' }} title="Сбросить записанный маршрут" onClick={() => { playClickSound(); setSavedExtents([]); }}>
                  <X size={32} />
                </button>
              </div>
            )}

            <button className="control-btn" style={getControlBtnStyle()} title="Вернуться к экрану настроек" onClick={handleBackToSetup}>
              <X size={32} />
            </button>
            <button className="control-btn" style={getControlBtnStyle()} title={isMuted ? "Включить звук" : "Выключить звук"} onClick={() => { setIsMuted(!isMuted); stopAudio(); }}>
              {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
            </button>
            <button className="control-btn" style={getControlBtnStyle()} title={projection === 'globe' ? "Переключить на плоскую карту" : "Переключить на глобус"} onClick={() => {
              playClickSound();
              stopAudio();
              const n = projection === 'globe' ? 'mercator' : 'globe';
              setProjection(n);
            }}>
              {projection === 'globe' ? <Earth size={32} /> : <Map size={32} />}
            </button>
          </div>
        </>
      )}

      {isViewOnly && (
        <nav className="view-navigation">
          <button className={`nav-arrow left ${arrowColorClass}`} title="Предыдущая зона" onClick={() => navigateExtent('prev')}>
            <ChevronLeft size={100} />
          </button>
          <button className={`nav-arrow right ${arrowColorClass}`} title="Следующая зона" onClick={() => navigateExtent('next')}>
            <ChevronRight size={100} />
          </button>
          <div className={`extent-counter ${arrowColorClass}`}>
            {viewExtentIdx + 1} / {savedExtents.length}
          </div>
          <button className="close-view-btn" title="Выйти из режима просмотра" onClick={() => window.location.href = window.location.origin + window.location.pathname}>
            <X size={30}/>
          </button>
        </nav>
      )}
    </main>
  );
};

export default App;
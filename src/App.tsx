import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { Eye, Map, Earth, X, ChevronLeft, ChevronRight } from 'lucide-react';

const REGIONS = [
  { id: 'africa', name: 'Африка', file: 'data/africa.geojson', bounds: [[-20, -35], [55, 38]] },
  { id: 'eurasia', name: 'Евразия', file: 'data/eurasia.geojson', bounds: [[-10, 10], [180, 80]] },
  { id: 'northamerica', name: 'Северная Америка', file: 'data/northamerica.geojson', bounds: [[-170, 7], [-15, 84]] },
  { id: 'southamerica', name: 'Южная Америка', file: 'data/southamerica.geojson', bounds: [[-95, -58], [-30, 15]] },
  { id: 'australia', name: 'Австралия', file: 'data/australia.geojson', bounds: [[110, -45], [155, -10]] },
];

const HIGH_CONTRAST_PALETTE = [
  'match', ['get', 'Zone'],
  'арктических пустынь', '#FFFFFF',
  'вечные снега и льды', '#B0E0E6',
  'влажных экваториальных лесов', '#006400',
  'жестколистных вечнозеленых лесов и кустарников', '#8B4513',
  'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)', '#8B4513',
  'лесостепей', '#DAA520',
  'лесотундры', '#D2B48C',
  'области высотной поясности', '#800080',
  'переменно-влажных (в том числе муссонных) лесов', '#32CD32',
  'полупустынь и пустынь', '#FFD700',
  'саванн и редколесий', '#E9967A',
  'смешанных лесов', '#7CFC00',
  'степей', '#F4A460',
  'степей (пампа)', '#F4A460',
  'тундры', '#4682B4',
  'тундры и приокеанических лугов', '#4682B4',
  'хвойных лесов (тайги)', '#004d00',
  'широколиственных лесов', '#228B22',
  '#333333'
];



const App: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'lowVision'>('normal');
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [currentRegionIdx, setCurrentRegionIdx] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#a2d2ff' } }]
      },
      center: [20, 20],
      zoom: 1,
    } as any);

    map.current = mapInstance;

    mapInstance.on('load', () => {
      const m = mapInstance;
      (m as any).setProjection({ type: 'globe' });

      // Общий слой для обычного режима
      m.addSource('zones-data', { type: 'geojson', data: 'data/zones.geojson' });
      m.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones-data',
        paint: {
          'fill-color': [
            'match', ['get', 'Приро'],
            'смешанных', '#90EE90',
            'лесостепей и степей', '#F0E68C',
            'полупустынь и пустынь', '#F4A460',
            'саванн и редколесий', '#BDB76B',
            'жестколистных', '#808000',
            'влажных', '#008080',
            'переменно-влажных', '#20B2AA',
            'тайги', '#9ACD32',
            'тундры и лесотундры', '#DDA0DD',
            'арктических', '#DCDCDC',
            'области высотной поясности', '#FFB6C1',
            '#9bf6ff'
          ] as any,
          'fill-opacity': 0.7
        }
      });

      // Слои для материков (Слабовидение)
      REGIONS.forEach(reg => {
        m.addSource(`${reg.id}-source`, { type: 'geojson', data: reg.file });
        
        // Слой контура материка
        m.addLayer({
          id: `${reg.id}-outline`,
          type: 'line',
          source: `${reg.id}-source`,
          layout: { 'visibility': 'none' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 0.6
          }
        });

        // Слой самих зон
        m.addLayer({
          id: `${reg.id}-fill`,
          type: 'fill',
          source: `${reg.id}-source`,
          layout: { 'visibility': 'none' },
          paint: {
            'fill-color': HIGH_CONTRAST_PALETTE as any,
            'fill-opacity': 1.0
          }
        });
      });

      // Логика клика для выбора зоны
      m.on('click', (e) => {
        // Достаем актуальный ID региона из замыкания через состояние
      });
    });

    return () => { if (map.current) map.current.remove(); };
  }, []);

  // Отдельный useEffect для кликов, чтобы всегда иметь доступ к актуальным стейтам
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (viewMode !== 'lowVision') return;

      const regionId = REGIONS[currentRegionIdx].id;
      const features = m.queryRenderedFeatures(e.point, {
        layers: [`${regionId}-fill`]
      });

      if (features.length > 0) {
        const zoneName = features[0].properties?.Zone;
        setSelectedZone(zoneName);
        // Фильтр: показываем только то, чье имя совпадает с выбранным
        m.setFilter(`${regionId}-fill`, ['==', ['get', 'Zone'], zoneName]);
      } else {
        // Клик в пустоту - сброс
        setSelectedZone(null);
        m.setFilter(`${regionId}-fill`, null);
      }
    };

    m.on('click', handleClick);
    return () => { m.off('click', handleClick); };
  }, [viewMode, currentRegionIdx]);

  const changeRegion = (direction: 'next' | 'prev') => {
    let newIdx = direction === 'next' ? currentRegionIdx + 1 : currentRegionIdx - 1;
    if (newIdx >= REGIONS.length) newIdx = 0;
    if (newIdx < 0) newIdx = REGIONS.length - 1;

    const m = map.current;
    if (!m) return;

    // Скрываем старый регион и его контур
    m.setLayoutProperty(`${REGIONS[currentRegionIdx].id}-fill`, 'visibility', 'none');
    m.setLayoutProperty(`${REGIONS[currentRegionIdx].id}-outline`, 'visibility', 'none');
    
    // Сбрасываем фильтры и текст
    setSelectedZone(null);
    m.setFilter(`${REGIONS[newIdx].id}-fill`, null);

    // Показываем новый
    m.setLayoutProperty(`${REGIONS[newIdx].id}-fill`, 'visibility', 'visible');
    m.setLayoutProperty(`${REGIONS[newIdx].id}-outline`, 'visibility', 'visible');
    
    m.fitBounds(REGIONS[newIdx].bounds as any, {
      padding: 60,
      speed: 1.2,
      essential: true
    });
    
    setCurrentRegionIdx(newIdx);
  };

  const setView = (mode: 'normal' | 'lowVision') => {
    const m = map.current;
    if (!m) return;
    setViewMode(mode);
    setSelectedZone(null);

    if (mode === 'lowVision') {
      setProjection('mercator');
      (m as any).setProjection({ type: 'mercator' });
      m.setPaintProperty('background', 'background-color', '#000000');
      m.setLayoutProperty('zones-fill', 'visibility', 'none');
      
      const reg = REGIONS[currentRegionIdx];
      m.setLayoutProperty(`${reg.id}-fill`, 'visibility', 'visible');
      m.setLayoutProperty(`${reg.id}-outline`, 'visibility', 'visible');
      m.setFilter(`${reg.id}-fill`, null);
      
      m.fitBounds(reg.bounds as any, { padding: 60 });
    } else {
      setProjection('globe');
      (m as any).setProjection({ type: 'globe' });
      m.setPaintProperty('background', 'background-color', '#a2d2ff');
      m.setLayoutProperty('zones-fill', 'visibility', 'visible');
      
      REGIONS.forEach(reg => {
        m.setLayoutProperty(`${reg.id}-fill`, 'visibility', 'none');
        m.setLayoutProperty(`${reg.id}-outline`, 'visibility', 'none');
        m.setFilter(`${reg.id}-fill`, null);
      });
      m.flyTo({ center: [60, 30], zoom: 1 });
    }
    setIsMenuOpen(false);
  };

  const arrowTheme = projection === 'globe' ? 'dark' : 'light';

  return (
    <div className="app-container">
      <div ref={mapContainer} className="map-container" />
      
      {viewMode === 'lowVision' && (
        <>
          <button className={`nav-arrow left ${arrowTheme}`} onClick={() => changeRegion('prev')}>
            <ChevronLeft size={100} strokeWidth={3} />
          </button>
          <button className={`nav-arrow right ${arrowTheme}`} onClick={() => changeRegion('next')}>
            <ChevronRight size={100} strokeWidth={3} />
          </button>
          <div className={`region-indicator ${arrowTheme}`}>{REGIONS[currentRegionIdx].name}</div>
          
          {selectedZone && (
            <div className="zone-title-overlay">
              {selectedZone}
            </div>
          )}
        </>
      )}

      <div className={`side-menu ${isMenuOpen ? 'open' : 'hidden'}`}>
        <button onClick={() => setIsMenuOpen(false)} className="close-btn"><X /></button>
        <h2>Доступность</h2>
        <button className="menu-btn" onClick={() => setView('normal')}>Обычный режим</button>
        <button className="menu-btn" onClick={() => setView('lowVision')}>Слабовидение (Материки)</button>
      </div>

      <div className="controls-stack">
        <button className="control-btn" onClick={() => {
          const next = projection === 'globe' ? 'mercator' : 'globe';
          setProjection(next);
          if (map.current) {
            (map.current as any).setProjection({ type: next });
            map.current.setPaintProperty('background', 'background-color', viewMode === 'lowVision' ? '#000000' : '#a2d2ff');
          }
        }}>
          {projection === 'globe' ? <Map size={32} /> : <Earth size={32} />}
        </button>

        {!isMenuOpen && (
          <button onClick={() => setIsMenuOpen(true)} className="control-btn eye-btn">
            <Eye size={40} color="white" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
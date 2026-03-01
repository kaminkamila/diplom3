import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { Eye, Map, Earth, X, ChevronLeft, ChevronRight, List } from 'lucide-react';

// Типизация для регионов, чтобы избежать ошибок LngLatLike
interface Region {
  id: string;
  name: string;
  file: string;
  center: [number, number];
  zoom: number;
}

const REGIONS: Region[] = [
  { id: 'world', name: 'Весь мир', file: '', center: [20, 20], zoom: 1.5 },
  { id: 'africa', name: 'Африка', file: 'data/africa.geojson', center: [18.49, 2.05], zoom: 2.59 },
  { id: 'eurasia', name: 'Евразия', file: 'data/eurasia.geojson', center: [84.8, 55.6], zoom: 1.67 },
  { id: 'northamerica', name: 'Северная Америка', file: 'data/northamerica.geojson', center: [-88.1, 65.3], zoom: 1.68 },
  { id: 'southamerica', name: 'Южная Америка', file: 'data/southamerica.geojson', center: [-65.35, -26.24], zoom: 2.66 },
  { id: 'australia', name: 'Австралия', file: 'data/australia.geojson', center: [142.84, -26.58], zoom: 3.2 },
];

const NORMAL_PALETTE: any = [
  'match', ['get', 'Zone'],
  'смешанных лесов', '#90EE90', 'широколиственных лесов', '#3CB371', 'лесостепей', '#F0E68C',
  'лесотундры', '#D2B48C', 'степей', '#FFF44F', 'степей (пампа)', '#FFF44F',
  'полупустынь и пустынь', '#F4A460', 'саванн и редколесий', '#BDB76B',
  'жестколистных вечнозеленых лесов и кустарников', '#808000',
  'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)', '#808000',
  'влажных экваториальных лесов', '#008080', 'переменно-влажных (в том числе муссонных) лесов', '#20B2AA',
  'хвойных лесов (тайги)', '#9ACD32', 'тундры', '#DDA0DD', 'тундры и приокеанических лугов', '#D8BFD8',
  'арктических пустынь', '#DCDCDC', 'области высотной поясности', '#FFB6C1', 'вечные снега и льды', '#E0FFFF',
  '#9bf6ff'
];

const HIGH_CONTRAST_PALETTE: any = [
  'match', ['get', 'Zone'],
  'арктических пустынь', '#FFFFFF', 'вечные снега и льды', '#B0E0E6', 'влажных экваториальных лесов', '#006400',
  'жестколистных вечнозеленых лесов и кустарников', '#8B4513', 'жестколистных вечнозеленых лесов и кустарников (средиземноморского типа)', '#8B4513',
  'лесостепей', '#DAA520', 'лесотундры', '#D2B48C', 'области высотной поясности', '#800080',
  'переменно-влажных (в том числе муссонных) лесов', '#32CD32', 'полупустынь и пустынь', '#FFD700',
  'саванн и редколесий', '#E9967A', 'смешанных лесов', '#7CFC00', 'степей', '#F4A460',
  'степей (пампа)', '#F4A460', 'тундры', '#4682B4', 'тундры и приокеанических лугов', '#4682B4',
  'хвойных лесов (тайги)', '#004d00', 'широколиственных лесов', '#228B22', '#333333'
];

const ACHROM_PALETTE: any = [
  'match', ['get', 'Zone'],
  'арктических пустынь', '#FFFFFF', 'вечные снега и льды', '#F8F8F8', 'тундры', '#D3D3D3',
  'лесотундры', '#BDBDBD', 'хвойных лесов (тайги)', '#444444', 'смешанных лесов', '#888888',
  'широколиственных лесов', '#666666', 'лесостепей', '#E0E0E0', 'степей', '#CCCCCC',
  'полупустынь и пустынь', '#F0F0F0', 'саванн и редколесий', '#A9A9A9',
  'жестколистных вечнозеленых лесов и кустарников', '#555555',
  'переменно-влажных (в том числе муссонных) лесов', '#333333', 'влажных экваториальных лесов', '#111111',
  'области высотной поясности', '#222222', '#888888'
];

const ACHROM_PATTERNS: any = [
  'match', ['get', 'Zone'],
  'тундры', 'pattern-sparse-dots', 'лесотундры', 'pattern-dots', 'хвойных лесов (тайги)', 'pattern-lines',
  'смешанных лесов', 'pattern-dots', 'широколиственных лесов', 'pattern-grid',
  'полупустынь и пустынь', 'pattern-diagonal-grid', 'саванн и редколесий', 'pattern-h-lines',
  'области высотной поясности', 'pattern-grid', 'none'
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
  { name: 'Вечные снега и льды', color: '#E0FFFF' },
];

const createPatternImage = (type: string, color = '#000000'): ImageData => {
  const size = 12; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!; ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.beginPath();
  if (type === 'dots') { ctx.fillStyle = color; ctx.arc(6, 6, 1.5, 0, Math.PI * 2); ctx.fill(); return ctx.getImageData(0, 0, 12, 12); }
  if (type === 'sparse-dots') { ctx.fillStyle = color; ctx.arc(2, 2, 1.2, 0, Math.PI * 2); ctx.fill(); return ctx.getImageData(0, 0, 12, 12); }
  if (type === 'lines') { ctx.moveTo(0, 0); ctx.lineTo(12, 12); }
  if (type === 'v-lines') { ctx.moveTo(6, 0); ctx.lineTo(6, 12); }
  if (type === 'h-lines') { ctx.moveTo(0, 6); ctx.lineTo(12, 6); }
  if (type === 'grid') { ctx.moveTo(6, 0); ctx.lineTo(6, 12); ctx.moveTo(0, 6); ctx.lineTo(12, 6); }
  if (type === 'diagonal-grid') { ctx.moveTo(0, 0); ctx.lineTo(12, 12); ctx.moveTo(12, 0); ctx.lineTo(0, 12); }
  ctx.stroke(); return ctx.getImageData(0, 0, 12, 12);
};

type ViewMode = 'normal' | 'lowVision' | 'achromatopsia';

const App: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [currentRegionIdx, setCurrentRegionIdx] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const stopAudio = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; } };
  const playClickSound = () => { new Audio('music/Клик.mp3').play().catch(() => {}); };

  const playZoneSound = (name: string) => {
    stopAudio();
    const lowerName = name.trim().toLowerCase();
    let fileName = (lowerName.startsWith('зона') || lowerName.startsWith('вечные') || lowerName.startsWith('области')) ? name : `Зона ${name}`;
    const audio = new Audio(`music/${fileName}.mp3`);
    audio.play().catch(err => console.error("Audio error:", fileName, err));
    audioRef.current = audio;
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#a2d2ff' } }] },
      center: [20, 20], zoom: 1, hash: true,
    } as any);
    map.current = mapInstance;

    mapInstance.on('load', () => {
      const m = mapInstance;
      ['dots', 'sparse-dots', 'lines', 'v-lines', 'h-lines', 'grid', 'diagonal-grid'].forEach(p => {
        m.addImage(`pattern-${p}`, { width: 12, height: 12, data: new Uint8Array(createPatternImage(p).data) });
      });

      m.addSource('zones-data', { type: 'geojson', data: 'data/mir.geojson' });
      m.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones-data', paint: { 'fill-color': NORMAL_PALETTE, 'fill-opacity': 0.7 } });
      m.addLayer({ id: 'zones-achrom-bg', type: 'fill', source: 'zones-data', layout: { 'visibility': 'none' }, paint: { 'fill-color': ACHROM_PALETTE, 'fill-opacity': 1.0 } });
      m.addLayer({ id: 'zones-achrom-pattern', type: 'fill', source: 'zones-data', layout: { 'visibility': 'none' }, paint: { 'fill-pattern': ACHROM_PATTERNS, 'fill-opacity': 0.4 } });
      m.addLayer({ id: 'zones-achrom-outline', type: 'line', source: 'zones-data', layout: { 'visibility': 'none' }, paint: { 'line-color': '#000000', 'line-width': 1.5 } });

      REGIONS.forEach(reg => {
        if (reg.id === 'world') return;
        m.addSource(`${reg.id}-source`, { type: 'geojson', data: reg.file });
        m.addLayer({ id: `${reg.id}-outline`, type: 'line', source: `${reg.id}-source`, layout: { 'visibility': 'none' }, paint: { 'line-color': '#ffffff', 'line-width': 2 } });
        m.addLayer({ id: `${reg.id}-fill`, type: 'fill', source: `${reg.id}-source`, layout: { 'visibility': 'none' }, paint: { 'fill-color': HIGH_CONTRAST_PALETTE, 'fill-opacity': 1.0 } });
      });
    });
    return () => { if (map.current) map.current.remove(); };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      let zoneName = null;
      const regionId = REGIONS[currentRegionIdx].id;
      
      if (viewMode === 'lowVision') {
        const activeLayer = regionId === 'world' ? 'zones-fill' : `${regionId}-fill`;
        const features = m.queryRenderedFeatures(e.point, { layers: [activeLayer] });
        if (features.length > 0) {
          zoneName = features[0].properties?.Zone; setSelectedZone(zoneName);
          m.setFilter(activeLayer, ['==', ['get', 'Zone'], zoneName]);
        } else { setSelectedZone(null); m.setFilter(activeLayer, null); stopAudio(); }
      } else {
        const features = m.queryRenderedFeatures(e.point, { layers: ['zones-fill', 'zones-achrom-bg'] });
        if (features.length > 0) { zoneName = features[0].properties?.Zone; setSelectedZone(zoneName); }
        else { setSelectedZone(null); stopAudio(); }
      }
      if (zoneName) playZoneSound(zoneName);
    };
    m.on('click', handleClick);
    return () => { m.off('click', handleClick); };
  }, [viewMode, currentRegionIdx]);

  const changeRegion = (direction: 'next' | 'prev') => {
    playClickSound(); stopAudio();
    const m = map.current; if (!m) return;
    
    const currentId = REGIONS[currentRegionIdx].id;
    if (currentId === 'world') m.setLayoutProperty('zones-fill', 'visibility', 'none');
    else { 
      m.setLayoutProperty(`${currentId}-fill`, 'visibility', 'none'); 
      m.setLayoutProperty(`${currentId}-outline`, 'visibility', 'none'); 
    }

    let newIdx = direction === 'next' ? currentRegionIdx + 1 : currentRegionIdx - 1;
    if (newIdx >= REGIONS.length) newIdx = 0; if (newIdx < 0) newIdx = REGIONS.length - 1;
    
    const nextReg = REGIONS[newIdx];
    setSelectedZone(null);

    if (nextReg.id === 'world') {
      m.setLayoutProperty('zones-fill', 'visibility', 'visible');
      m.setPaintProperty('zones-fill', 'fill-color', HIGH_CONTRAST_PALETTE);
      m.setPaintProperty('zones-fill', 'fill-opacity', 1.0);
    } else {
      m.setLayoutProperty(`${nextReg.id}-fill`, 'visibility', 'visible');
      m.setLayoutProperty(`${nextReg.id}-outline`, 'visibility', 'visible');
      m.setFilter(`${nextReg.id}-fill`, null);
    }

    m.flyTo({ center: nextReg.center, zoom: nextReg.zoom, speed: 1.2, essential: true });
    setCurrentRegionIdx(newIdx);
  };

  const setView = (mode: ViewMode) => {
    playClickSound(); stopAudio();
    const m = map.current; if (!m) return;
    setViewMode(mode); setSelectedZone(null); setIsMenuOpen(false);
    
    m.setLayoutProperty('zones-fill', 'visibility', 'none');
    m.setLayoutProperty('zones-achrom-bg', 'visibility', 'none');
    m.setLayoutProperty('zones-achrom-pattern', 'visibility', 'none');
    m.setLayoutProperty('zones-achrom-outline', 'visibility', 'none');
    REGIONS.forEach(r => { 
      if(r.id !== 'world') { 
        m.setLayoutProperty(`${r.id}-fill`, 'visibility', 'none'); 
        m.setLayoutProperty(`${r.id}-outline`, 'visibility', 'none'); 
      }
    });

    if (mode === 'lowVision') {
      setCurrentRegionIdx(0);
      setProjection('mercator'); (m as any).setProjection({ type: 'mercator' });
      m.setPaintProperty('background', 'background-color', '#000000');
      m.setLayoutProperty('zones-fill', 'visibility', 'visible');
      m.setPaintProperty('zones-fill', 'fill-color', HIGH_CONTRAST_PALETTE);
      m.setPaintProperty('zones-fill', 'fill-opacity', 1.0);
      m.jumpTo({ center: REGIONS[0].center, zoom: REGIONS[0].zoom });
    } else if (mode === 'achromatopsia') {
      setProjection('mercator'); (m as any).setProjection({ type: 'mercator' });
      m.setPaintProperty('background', 'background-color', '#f0f0f0');
      m.setLayoutProperty('zones-achrom-bg', 'visibility', 'visible');
      m.setLayoutProperty('zones-achrom-pattern', 'visibility', 'visible');
      m.setLayoutProperty('zones-achrom-outline', 'visibility', 'visible');
    } else {
      setProjection('globe'); (m as any).setProjection({ type: 'globe' });
      m.setPaintProperty('background', 'background-color', '#a2d2ff');
      m.setLayoutProperty('zones-fill', 'visibility', 'visible');
      m.setPaintProperty('zones-fill', 'fill-color', NORMAL_PALETTE);
      m.setPaintProperty('zones-fill', 'fill-opacity', 0.7);
    }
  };

  return (
    <div className={`app-container ${viewMode !== 'normal' ? 'large-cursor' : ''}`}>
      <div ref={mapContainer} className="map-container" />
      
      {viewMode === 'normal' && (
        <>
          <button className="control-btn legend-toggle-btn" onClick={() => { playClickSound(); setIsLegendOpen(!isLegendOpen); }}>
            <List size={24} />
          </button>
          {isLegendOpen && (
            <div className="legend-panel">
              <div className="legend-header">
                <h3>Природные зоны</h3>
                <button onClick={() => setIsLegendOpen(false)}><X size={20}/></button>
              </div>
              <div className="legend-scroll">
                {LEGEND_ITEMS.map((item, i) => (
                  <div key={i} className="legend-row">
                    <span className="legend-color" style={{background: item.color}} />
                    <span className="legend-label">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(viewMode === 'lowVision' || viewMode === 'achromatopsia') && (
        <>
          {viewMode === 'lowVision' && (
            <>
              <button className="nav-arrow left light" onClick={() => changeRegion('prev')}><ChevronLeft size={100} /></button>
              <button className="nav-arrow right light" onClick={() => changeRegion('next')}><ChevronRight size={100} /></button>
              <div className="region-indicator light">{REGIONS[currentRegionIdx].name}</div>
            </>
          )}
          {selectedZone && <div className="zone-title-overlay">{selectedZone}</div>}
        </>
      )}

      <div className={`side-menu ${isMenuOpen ? 'open' : 'hidden'}`}>
        <button onClick={() => { playClickSound(); setIsMenuOpen(false); }} className="close-btn"><X /></button>
        <h2>Доступность</h2>
        <button className="menu-btn" onClick={() => setView('normal')}>Обычный режим</button>
        <button className="menu-btn" onClick={() => setView('lowVision')}>Слабовидение</button>
        <button className="menu-btn" onClick={() => setView('achromatopsia')}>Ахромазия</button>
      </div>

      <div className="controls-stack">
        <button className="control-btn" onClick={() => {
          playClickSound(); stopAudio();
          const n = projection === 'globe' ? 'mercator' : 'globe';
          setProjection(n); if(map.current) (map.current as any).setProjection({type: n});
        }}>
          {projection === 'globe' ? <Map size={32} /> : <Earth size={32} />}
        </button>
        {!isMenuOpen && (
          <button onClick={() => { playClickSound(); setIsMenuOpen(true); }} className="control-btn eye-btn">
            <Eye size={40} color="white" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
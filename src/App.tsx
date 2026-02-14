import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';

const App: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#a2d2ff' }
          }
        ]
      },
      center: [0, 0],
      zoom: 2
    });

    map.current.on('load', () => {
      map.current?.resize();
      map.current?.setProjection({ type: 'globe' });

      map.current?.addSource('world-data', {
        type: 'geojson',
        data: 'data/world_adm.geojson' 
      });

      map.current?.addLayer({
        id: 'land-fill',
        type: 'fill',
        source: 'world-data',
        paint: {
          'fill-color': '#f0f0f0',
          'fill-outline-color': '#333333'
        }
      });

      map.current?.addLayer({
        id: 'land-borders',
        type: 'line',
        source: 'world-data',
        paint: {
          'line-color': '#555555',
          'line-width': 0.5
        }
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="app-container">
      {/* Карта */}
      <div ref={mapContainer} className="map-container" />

      {/* Боковое меню */}
      <div className={`side-menu ${isMenuOpen ? 'open' : 'hidden'}`}>
        <button onClick={() => setIsMenuOpen(false)} className="close-btn">✕</button>
        <h2>Доступность</h2>
        <button className="menu-btn" onClick={() => alert('Режим Дальтонизм')}>Дальтонизм</button>
        <button className="menu-btn" onClick={() => alert('Режим Слабовидение')}>Слабовидение</button>
      </div>

      {/* Кнопка настроек */}
      {!isMenuOpen && (
        <button onClick={() => setIsMenuOpen(true)} className="main-btn">
          Настройки
        </button>
      )}
    </div>
  );
};

export default App;
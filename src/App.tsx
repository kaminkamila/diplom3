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
            paint: { 'background-color': '#f8f9fa' }
          }
        ]
      },
      center: [60, 30],
      zoom: 2
    });

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.setProjection({ type: 'globe' });

      map.current.addSource('zones-data', {
        type: 'geojson',
        data: 'data/zones.geojson'
      });

      map.current.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones-data',
        paint: {
          'fill-color': [
            'match',
            ['get', 'Приро'],
            'смешанных', '#90EE90',
            'лесостепей и степей', '#F0E68C',
            'полупустынь и пустынь', '#F4A460',
            'саванн и редколесий', '#BDB76B',
            'жестколистных', '#808000',
            'влажных', '#008080',
            'переменно-влажных', '#20B2AA',
            'тайги', '#9ACD32',
            'тундры и лесотундры', '#DDA0DD',
            'арктических','#DCDCDC',
            'области высотной поясности','#FFB6C1',
            '#9bf6ff'          // Цвет по умолчанию
          ],
          'fill-opacity': 0.7
        }
      });

      map.current.addLayer({
        id: 'zones-borders',
        type: 'line',
        source: 'zones-data',
        paint: {
          'line-color': '#333',
          'line-width': 1
        }
      });

      // Обработка клика
      map.current.on('click', 'zones-fill', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const properties = feature.properties;

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="color: #333; padding: 5px;">
              <h3 style="margin: 0 0 5px 0;">Инфо о зоне</h3>
              <p><strong>Приро:</strong> ${properties?.Приро || 'Не указано'}</p>
            </div>
          `)
          .addTo(map.current!);
      });

      // Меняем курсор при наведении
      map.current.on('mouseenter', 'zones-fill', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'zones-fill', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="app-container">
      <div ref={mapContainer} className="map-container" />
      
      <div className={`side-menu ${isMenuOpen ? 'open' : 'hidden'}`}>
        <button onClick={() => setIsMenuOpen(false)} className="close-btn">✕</button>
        <h2>Доступность</h2>
        <button className="menu-btn" onClick={() => alert('Режим Дальтонизм')}>Дальтонизм</button>
        <button className="menu-btn" onClick={() => alert('Режим Слабовидение')}>Слабовидение</button>
      </div>

      {!isMenuOpen && (
        <button onClick={() => setIsMenuOpen(true)} className="main-btn">
          Настройки
        </button>
      )}
    </div>
  );
};

export default App;

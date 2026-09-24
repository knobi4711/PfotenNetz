'use client';

import { useEffect, useRef } from 'react';
import { fetchOsrmWalkingRoute, type RoutingPoint } from '@pfotennetz/shared';

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
};
type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
};
type LeafletApi = {
  map: (element: HTMLDivElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: { maxZoom: number; attribution: string }
  ) => { addTo: (map: LeafletMap) => void };
  layerGroup: () => LeafletLayerGroup;
  marker: (center: [number, number]) => {
    addTo: (target: LeafletLayerGroup) => { bindPopup: (content: string) => void };
  };
  polyline: (
    points: Array<[number, number]>,
    options: Record<string, number | string>
  ) => { addTo: (target: LeafletLayerGroup) => void };
};

function loadLeaflet(): Promise<LeafletApi> {
  const script =
    document.querySelector<HTMLScriptElement>('script[data-pfotennetz-leaflet]') ??
    document.createElement('script');
  if (!script.src) {
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.dataset.pfotennetzLeaflet = 'true';
    document.head.appendChild(script);
  }
  return new Promise((resolve, reject) => {
    const check = () => {
      const leaflet = (window as unknown as { L?: LeafletApi }).L;
      if (leaflet) resolve(leaflet);
      else window.setTimeout(check, 50);
    };
    script.addEventListener('load', check, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Kartenbibliothek konnte nicht geladen werden.')),
      { once: true }
    );
    check();
  });
}

export function LiveTrackingMap({
  latitude,
  longitude,
  recordedAt,
  points,
}: {
  latitude: number;
  longitude: number;
  recordedAt: string | null;
  points: Array<{ latitude: number; longitude: number }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<LeafletLayerGroup | null>(null);

  useEffect(() => {
    const styleId = 'pfotennetz-leaflet-css';
    if (!document.getElementById(styleId)) {
      const stylesheet = document.createElement('link');
      stylesheet.id = styleId;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(stylesheet);
    }
    let disposed = false;
    void loadLeaflet().then(async (leaflet) => {
      if (disposed || !ref.current) return;
      const fresh = !map.current;
      map.current = map.current ?? leaflet.map(ref.current);
      map.current.setView([latitude, longitude], 16);
      layers.current = layers.current ?? leaflet.layerGroup().addTo(map.current);
      layers.current.clearLayers();
      if (fresh) {
        leaflet
          .tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap-Mitwirkende',
          })
          .addTo(map.current);
      }
      let routePoints: RoutingPoint[] = points;
      if (points.length > 1) {
        try {
          const calculated = await fetchOsrmWalkingRoute(points);
          if (!disposed && calculated.length > 1) routePoints = calculated;
        } catch {
          // Die lokale GPS-Spur bleibt als robuste Offline-/Fallback-Darstellung sichtbar.
        }
      }
      if (disposed) return;
      if (routePoints.length > 1) {
        leaflet
          .polyline(
            routePoints.map((point) => [point.latitude, point.longitude]),
            { color: '#e26d46', weight: 5, opacity: 0.85 }
          )
          .addTo(layers.current);
      }
      leaflet
        .marker([latitude, longitude])
        .addTo(layers.current)
        .bindPopup(
          recordedAt
            ? `Letzte Position: ${new Date(recordedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Aktuelle Tracking-Position'
        );
    });
    return () => {
      disposed = true;
    };
  }, [latitude, longitude, recordedAt, points]);

  useEffect(() => () => map.current?.remove(), []);

  return (
    <div ref={ref} className="h-[430px] w-full" aria-label="OpenStreetMap-Live-Tracking-Karte" />
  );
}

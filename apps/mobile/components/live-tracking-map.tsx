import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { WebView } from 'react-native-webview';
import { appFonts, usePalette } from './ui';
import {
  LEAFLET_MAP_ERROR,
  LEAFLET_MAP_READY,
  LeafletMapView,
  leafletPage,
  toScriptJson,
} from './leaflet-map';

export interface LiveTrackPoint {
  latitude: number;
  longitude: number;
}

interface TrackPayload {
  points: Array<[number, number]>;
  latest: { latitude: number; longitude: number } | null;
}

/**
 * The track is rendered directly from the page's initializer, so the map never
 * depends on a successful `injectJavaScript` call. Live updates are injected
 * afterwards, once the page reported that Leaflet is ready.
 */
function trackingInitScript(radiusMeters: number, initialJson: string): string {
  const radius = Math.max(50, Math.round(radiusMeters));
  return `function(){
    var radius=${radius};
    var initial=${initialJson};
    var map=L.map('map',{zoomControl:true,attributionControl:true}).setView([51.16,10.45],6);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap-Mitwirkende'}).addTo(map);
    var track=L.polyline([],{color:'#b34a28',weight:4,opacity:0.9}).addTo(map);
    var zone=L.circle([0,0],{radius:radius,color:'#b34a28',weight:1,fillColor:'#b34a28',fillOpacity:0.08});
    var marker=L.circleMarker([0,0],{radius:9,weight:3,color:'#ffffff',fillColor:'#b34a28',fillOpacity:0}).addTo(map);
    var fitted=false;

    window.renderTrack=function(data){
      data=data||{};
      var pts=data.points||[];
      track.setLatLngs(pts);
      if(pts.length>0){
        zone.setLatLng(pts[0]);
        if(!map.hasLayer(zone)){ zone.addTo(map); }
      }else if(map.hasLayer(zone)){
        map.removeLayer(zone);
      }
      var latest=data.latest;
      if(!latest){
        marker.setStyle({opacity:0,fillOpacity:0});
        return;
      }
      marker.setStyle({opacity:1,fillOpacity:1});
      var at=[latest.latitude,latest.longitude];
      marker.setLatLng(at);
      if(!fitted){
        if(pts.length>1){ map.fitBounds(L.latLngBounds(pts).pad(0.35)); }else{ map.setView(at,16); }
        fitted=true;
      }else if(!map.getBounds().contains(at)){
        map.panTo(at);
      }
    };

    map.invalidateSize();
    window.renderTrack(initial);
  }`;
}

export function LiveTrackingMap({
  points,
  latitude,
  longitude,
  radiusMeters,
  height = 320,
}: {
  points: LiveTrackPoint[];
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  height?: number;
}) {
  const c = usePalette();
  const webView = useRef<WebView | null>(null);
  const [ready, setReady] = useState(false);

  const payload = useMemo<TrackPayload>(
    () => ({
      points: points.map((point) => [point.latitude, point.longitude]),
      latest: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    }),
    [latitude, longitude, points]
  );
  const payloadJson = useMemo(() => toScriptJson(payload), [payload]);

  // The HTML is only rebuilt when the safety radius changes; it carries the
  // payload that was current at that moment so the first frame already shows
  // the track.
  const initialPayload = useRef(payload);
  const html = useMemo(
    () => leafletPage(trackingInitScript(radiusMeters, toScriptJson(initialPayload.current))),
    [radiusMeters]
  );

  useEffect(() => {
    initialPayload.current = payload;
  }, [payload]);

  const injectTrack = () => {
    webView.current?.injectJavaScript(
      `if(window.renderTrack){window.renderTrack(${payloadJson});} true;`
    );
  };

  useEffect(() => {
    if (!ready) return;
    injectTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- injectTrack only reads refs and payloadJson
  }, [payloadJson, ready]);

  const summary =
    latitude !== null && longitude !== null
      ? `Live-Standort-Karte: aktuelle Position vorhanden, ${points.length} aufgezeichnete Streckenpunkte.`
      : `Live-Standort-Karte: noch keine aktuelle Position, ${points.length} aufgezeichnete Streckenpunkte.`;

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.fallback,
          { height, backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
        ]}
      >
        <Text style={[styles.fallbackIcon]}>📍</Text>
        <Text style={[styles.fallbackTitle, { color: c.onSurface }]}>Karte in der App</Text>
        <Text style={[styles.fallbackText, { color: c.onSurfaceVariant }]}>
          Die Live-Karte steht in der PfotenNetz-App zur Verfügung. Die Kennzahlen unten werden auch
          im Browser aktualisiert.
        </Text>
      </View>
    );
  }

  return (
    <LeafletMapView
      html={html}
      height={height}
      accessibilityLabel={summary}
      webViewRef={webView}
      onMessage={(message) => {
        if (message === LEAFLET_MAP_READY) {
          setReady(true);
          // Leaflet loads asynchronously, so the first render may still show an
          // older payload.
          injectTrack();
        } else if (message === LEAFLET_MAP_ERROR) {
          setReady(false);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    position: 'relative',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fallbackIcon: { fontSize: 32 },
  fallbackTitle: {
    fontFamily: appFonts.bold,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  fallbackText: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
});

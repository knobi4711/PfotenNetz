import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { appFonts, usePalette } from './ui';

export interface LiveTrackPoint {
  latitude: number;
  longitude: number;
}

/**
 * Same OpenStreetMap/Leaflet approach as the neighbourhood map: a WebView on
 * native platforms, a lightweight placeholder on web (the web app has its own
 * full map under /tracking).
 */
function trackingMapHtml(radiusMeters: number): string {
  const radius = Math.max(50, Math.round(radiusMeters));
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body,#map{height:100%;margin:0;background:#f4f0ed}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var map=L.map('map',{zoomControl:false}).setView([51.16,10.45],6);
L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap-Mitwirkende'}).addTo(map);
var track=L.polyline([],{color:'#e26d46',weight:4,opacity:0.9}).addTo(map);
var zone=L.circle([0,0],{radius:${radius},color:'#e26d46',weight:1,fillColor:'#e26d46',fillOpacity:0.08});
var marker=L.circleMarker([0,0],{radius:9,weight:3,color:'#ffffff',fillColor:'#e26d46',fillOpacity:1}).addTo(map);
var fitted=false;
window.renderTrack=function(data){
  var pts=data.points||[];
  track.setLatLngs(pts);
  if(pts.length>0){zone.setLatLng(pts[0]);if(!map.hasLayer(zone)){zone.addTo(map);}}
  var latest=data.latest;
  if(!latest){return;}
  var at=[latest.latitude,latest.longitude];
  marker.setLatLng(at);
  if(!fitted){
    if(pts.length>1){map.fitBounds(L.latLngBounds(pts).pad(0.35));}else{map.setView(at,16);}
    fitted=true;
  }else if(!map.getBounds().contains(at)){
    map.panTo(at);
  }
};
</script></body></html>`;
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
  const html = useMemo(() => trackingMapHtml(radiusMeters), [radiusMeters]);
  const payload = useMemo(
    () =>
      JSON.stringify({
        points: points.map((point) => [point.latitude, point.longitude]),
        latest: latitude !== null && longitude !== null ? { latitude, longitude } : null,
      }),
    [points, latitude, longitude]
  );

  useEffect(() => {
    if (!ready) return;
    webView.current?.injectJavaScript(`window.renderTrack(${payload}); true;`);
  }, [ready, payload]);

  if (Platform.OS === 'web') {
    return (
      <View
        accessibilityLabel="Live-Standort-Karte"
        style={[
          styles.map,
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
    <View style={[styles.map, { height, borderColor: c.outlineVariant }]}>
      <WebView
        ref={webView}
        accessibilityLabel="Live-Standort-Karte"
        javaScriptEnabled
        onLoadEnd={() => setReady(true)}
        onLoadStart={() => setReady(false)}
        originWhitelist={['*']}
        source={{ html }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
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
  },
  fallbackText: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
});

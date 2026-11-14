import { useState, type RefObject } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { appFonts, usePalette } from './ui';
import { LEAFLET_MAP_ERROR, LEAFLET_MAP_READY } from '../lib/leaflet-page';

export {
  LEAFLET_MAP_ERROR,
  LEAFLET_MAP_READY,
  leafletPage,
  toScriptJson,
} from '../lib/leaflet-page';

/**
 * Native map surface: a Leaflet page inside a WebView, framed like the other
 * cards of the app. Web stays on the per-screen fallback, so only render this
 * on iOS/Android.
 */
export function LeafletMapView({
  html,
  height,
  style,
  accessibilityLabel,
  webViewRef,
  onMessage,
}: {
  html: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  webViewRef?: RefObject<WebView | null>;
  onMessage?: (message: string) => void;
}) {
  const c = usePalette();
  const [failed, setFailed] = useState(false);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    if (message === LEAFLET_MAP_READY) {
      setFailed(false);
    } else if (message === LEAFLET_MAP_ERROR) {
      setFailed(true);
    }
    onMessage?.(message);
  };

  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

  return (
    <View
      {...a11y}
      style={[
        styles.frame,
        height !== undefined ? { height } : null,
        { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
        style,
      ]}
    >
      <WebView
        ref={webViewRef}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        javaScriptEnabled
        onMessage={handleMessage}
        originWhitelist={['*']}
        source={{ html }}
        // 0.99 forces a separate layer, which works around the blank white
        // WebView surface seen on some Android devices inside ScrollViews.
        style={[StyleSheet.absoluteFill, styles.webView]}
      />
      {failed ? (
        <View style={[styles.failedOverlay, { backgroundColor: c.surfaceContainerLow }]}>
          <Text style={[styles.title, { color: c.onSurface }]}>
            Karte konnte nicht geladen werden
          </Text>
          <Text style={[styles.text, { color: c.onSurfaceVariant }]}>
            Bitte prüfe deine Internetverbindung und öffne die Seite erneut.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webView: { opacity: 0.99 },
  title: {
    fontFamily: appFonts.bold,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  text: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  failedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});

export type BrowserLocation = { latitude: number; longitude: number; accuracy?: number };

const MAX_ACCEPTED_ACCURACY_METERS = 1_000;
const DEFAULT_LOCATION_TIMEOUT_SECONDS = 30;

export function hasUsableBrowserAccuracy(accuracy: number): boolean {
  return Number.isFinite(accuracy) && accuracy <= MAX_ACCEPTED_ACCURACY_METERS;
}

export function formatBrowserAccuracy(accuracy: number | undefined): string {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy)) return 'unbekannt';
  if (accuracy >= 1_000) return `${(accuracy / 1_000).toFixed(1)} km`;
  return `${Math.round(accuracy)} m`;
}

/** Turns the browser's technical geolocation error into an actionable message. */
export function describeBrowserLocationError(
  error: GeolocationPositionError | unknown,
  timeoutSeconds = DEFAULT_LOCATION_TIMEOUT_SECONDS
): Error {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return new Error(
      'Die Standortabfrage ist auf dieser unsicheren Verbindung nicht möglich. Öffne PfotenNetz über https:// (nicht über http://) und versuche es erneut.'
    );
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as GeolocationPositionError).code;
    if (code === 1) {
      return new Error(
        'Der Zugriff auf den Standort wurde verweigert. Erlaube den Standortzugriff für diese Website im Browser und aktiviere zusätzlich die Ortungsdienste von Windows bzw. die Standortberechtigung des Geräts.'
      );
    }
    if (code === 2) {
      return new Error(
        'Der Browser konnte keinen Standort bestimmen. Aktiviere die Ortungsdienste, schalte WLAN ein und deaktiviere testweise VPN oder Proxy. Auf einem Desktop-PC ohne GPS kann die Bestimmung mehrere Versuche benötigen.'
      );
    }
    if (code === 3) {
      return new Error(
        `Der Browser hat innerhalb von ${timeoutSeconds} Sekunden keinen Standort geliefert. Gehe kurz nach draußen oder näher ans Fenster, aktiviere WLAN und versuche es erneut.`
      );
    }
  }

  return new Error(
    'Der Standort konnte nicht bestimmt werden. Prüfe die Browser- und Geräteberechtigung sowie die Windows-Ortungsdienste und versuche es erneut.'
  );
}

export function describeBrowserAccuracyError(accuracy: number): Error {
  return new Error(
    `Der Browser hat einen Standort geliefert, aber nur mit einer Genauigkeit von etwa ${formatBrowserAccuracy(accuracy)}. Für diese Funktion benötigen wir einen genaueren Standort (höchstens 1 km). Aktiviere die Ortungsdienste, schalte WLAN ein und versuche es erneut.`
  );
}

/** Gets a fresh location and rejects coarse laptop/IP fallbacks. */
export function getCurrentBrowserLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          'Dieser Browser stellt keine Standortfunktion bereit. Verwende einen aktuellen Browser wie Chrome, Edge, Firefox oder Safari.'
        )
      );
      return;
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(describeBrowserLocationError(undefined));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!hasUsableBrowserAccuracy(coords.accuracy)) {
          reject(describeBrowserAccuracyError(coords.accuracy));
          return;
        }
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      },
      (error) => reject(describeBrowserLocationError(error)),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: DEFAULT_LOCATION_TIMEOUT_SECONDS * 1_000,
      }
    );
  });
}

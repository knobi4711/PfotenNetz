export type BrowserLocation = { latitude: number; longitude: number };

const MAX_ACCEPTED_ACCURACY_METERS = 5_000;

export function hasUsableBrowserAccuracy(accuracy: number): boolean {
  return Number.isFinite(accuracy) && accuracy <= MAX_ACCEPTED_ACCURACY_METERS;
}

/** Gets a fresh location and rejects coarse laptop/IP fallbacks. */
export function getCurrentBrowserLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Standortfreigabe wird von diesem Browser nicht unterstützt.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!hasUsableBrowserAccuracy(coords.accuracy)) {
          reject(
            new Error(
              'Der Browser liefert aktuell nur einen ungenauen Standort. Bitte aktiviere die Standortdienste von Windows und erlaube dem Browser den Standortzugriff.'
            )
          );
          return;
        }
        resolve({ latitude: coords.latitude, longitude: coords.longitude });
      },
      () => reject(new Error('Standort konnte nicht bestimmt werden.')),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 }
    );
  });
}

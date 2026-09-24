import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useCreateTrackingSession, useFinishTrackingSession } from '@pfotennetz/supabase';
import { ActionButton, Card, EmptyText, ErrorBox, SectionTitle } from './ui';
import { distanceMeters } from '../lib/tracking';
import { startTrackingGeofence, stopTrackingGeofence } from '../lib/geofence';
import { startBackgroundTracking, stopBackgroundTracking } from '../lib/tracking-background';

export function TrackingRecorder({ bookingId }: { bookingId: string }) {
  const create = useCreateTrackingSession();
  const finish = useFinishTrackingSession();
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const previous = useRef<Location.LocationObjectCoords | null>(null);
  const distance = useRef(0);
  const startedAt = useRef<number | null>(null);
  const backgroundEnabled = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayedDistanceMeters, setDisplayedDistanceMeters] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => subscription.current?.remove(), []);

  const start = async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setError('Standortfreigabe wird für das Live-Tracking benötigt.');
      return;
    }
    try {
      const session = await create.mutateAsync(bookingId);
      setSessionId(session.id);
      startedAt.current = Date.now();
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      previous.current = initial.coords;
      try {
        await startBackgroundTracking(session.id);
        backgroundEnabled.current = true;
      } catch {
        backgroundEnabled.current = false;
        setError(
          'Hintergrund-Tracking konnte nicht aktiviert werden; Vordergrund-Tracking läuft weiter.'
        );
      }
      try {
        await startTrackingGeofence(bookingId, initial.coords);
      } catch {
        setError(
          'Sicherheitszone konnte nicht aktiviert werden; Vordergrund-Tracking läuft weiter.'
        );
      }
      subscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 10000 },
        (location) => {
          if (previous.current) {
            distance.current += distanceMeters(previous.current, location.coords);
            setDisplayedDistanceMeters(distance.current);
          }
          previous.current = location.coords;
          if (!backgroundEnabled.current) return;
        }
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Live-Tracking konnte nicht gestartet werden.'
      );
    }
  };

  const stop = async () => {
    if (!sessionId) return;
    subscription.current?.remove();
    subscription.current = null;
    try {
      await stopBackgroundTracking().catch(() => undefined);
      await finish.mutateAsync({
        sessionId,
        distanceMeters: distance.current,
        durationSeconds: Math.max(0, (Date.now() - (startedAt.current ?? Date.now())) / 1000),
      });
      await stopTrackingGeofence().catch(() => undefined);
      backgroundEnabled.current = false;
      setSessionId(null);
      previous.current = null;
      distance.current = 0;
      setDisplayedDistanceMeters(0);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Live-Tracking konnte nicht beendet werden.'
      );
    }
  };

  return (
    <Card>
      <SectionTitle>Live-GPS-Tracking</SectionTitle>
      {sessionId ? (
        <EmptyText>
          Standort wird alle 10 Sekunden oder nach 10 Metern sicher übertragen. Gelaufen:{' '}
          {(displayedDistanceMeters / 1000).toFixed(2)} km
        </EmptyText>
      ) : (
        <EmptyText>Starte die GPS-Aufzeichnung für diese Betreuung erst vor Ort.</EmptyText>
      )}
      {error ? <ErrorBox message={error} /> : null}
      <ActionButton
        title={sessionId ? 'Tracking beenden' : 'Live-Tracking starten'}
        variant={sessionId ? 'secondary' : 'primary'}
        pending={create.isPending || finish.isPending}
        onPress={() => void (sessionId ? stop() : start())}
      />
    </Card>
  );
}

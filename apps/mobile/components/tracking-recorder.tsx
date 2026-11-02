import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  fetchActiveTrackingSessions,
  getSupabaseClient,
  insertTrackingPointRows,
  useCreateTrackingSession,
  useFinishTrackingSession,
} from '@pfotennetz/supabase';
import { ActionButton, Card, EmptyText, ErrorBox, SectionTitle } from './ui';
import { distanceMeters } from '../lib/tracking';
import { startTrackingGeofence, stopTrackingGeofence } from '../lib/geofence';
import { startBackgroundTracking, stopBackgroundTracking } from '../lib/tracking-background';
import { appendTrackingQueue, type QueuedTrackingPoint } from '../lib/tracking-queue';
import { flushTrackingQueue, queuedTrackingPoint } from '../lib/tracking-upload';

export function TrackingRecorder({
  bookingId,
  radius = 1000,
}: {
  bookingId: string;
  radius?: number;
}) {
  const create = useCreateTrackingSession();
  const finish = useFinishTrackingSession();
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const previous = useRef<Location.LocationObjectCoords | null>(null);
  const distance = useRef(0);
  const startedAt = useRef<number | null>(null);
  const backgroundEnabled = useRef(false);
  const pending = useRef<QueuedTrackingPoint[]>([]);
  const uploadInFlight = useRef<Promise<void> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayedDistanceMeters, setDisplayedDistanceMeters] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [operationPending, setOperationPending] = useState(false);

  useEffect(
    () => () => {
      subscription.current?.remove();
      // Keep not yet uploaded points for the next start instead of dropping them.
      if (pending.current.length > 0) {
        const batch = pending.current;
        pending.current = [];
        void appendTrackingQueue(batch);
      }
    },
    []
  );

  /**
   * The background task normally uploads every point. Without the "always"
   * location permission it never runs, so the foreground watcher has to send
   * the positions itself – otherwise the provider would never see the helper.
   */
  const uploadPending = async (): Promise<void> => {
    if (uploadInFlight.current !== null) {
      await uploadInFlight.current;
      if (pending.current.length > 0) await uploadPending();
      return;
    }
    if (pending.current.length === 0) return;

    const batch = pending.current;
    pending.current = [];
    const upload = (async () => {
      try {
        await insertTrackingPointRows(getSupabaseClient(), batch);
      } catch {
        await appendTrackingQueue(batch);
      }
    })();
    uploadInFlight.current = upload;
    try {
      await upload;
    } finally {
      uploadInFlight.current = null;
    }
  };

  const start = async () => {
    if (operationPending || sessionId !== null) return;
    setOperationPending(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError('Standortfreigabe wird für das Live-Tracking benötigt.');
        return;
      }

      // Reuse a session that is still open (app restart, screen reopened):
      // creating a second one would leave the first one running forever.
      const client = getSupabaseClient();
      const openSessions = await fetchActiveTrackingSessions(client);
      const open = openSessions.find((item) => item.booking_id === bookingId);
      const session = open ?? (await create.mutateAsync(bookingId));
      setSessionId(session.id);
      startedAt.current = Date.now();
      if (open !== undefined) {
        // Keep the distance the server already recorded for this session.
        distance.current = open.total_distance_meters;
        setDisplayedDistanceMeters(open.total_distance_meters);
      }
      await flushTrackingQueue(session.id);

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
          'Hintergrund-Tracking konnte nicht aktiviert werden; die Position wird nur bei geöffneter App übertragen.'
        );
      }
      try {
        await startTrackingGeofence(bookingId, initial.coords, radius);
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
          if (backgroundEnabled.current) return;
          pending.current.push(queuedTrackingPoint(location, session.id));
          void uploadPending();
        }
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Live-Tracking konnte nicht gestartet werden.'
      );
    } finally {
      setOperationPending(false);
    }
  };

  const stop = async () => {
    if (!sessionId || operationPending) return;
    setOperationPending(true);
    subscription.current?.remove();
    subscription.current = null;
    try {
      await uploadPending();
      await flushTrackingQueue(sessionId);
      await stopBackgroundTracking().catch(() => undefined);
      await stopTrackingGeofence().catch(() => undefined);
      await finish.mutateAsync({
        sessionId,
        distanceMeters: distance.current,
        durationSeconds: Math.max(0, (Date.now() - (startedAt.current ?? Date.now())) / 1000),
      });
      backgroundEnabled.current = false;
      setSessionId(null);
      previous.current = null;
      distance.current = 0;
      setDisplayedDistanceMeters(0);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Live-Tracking konnte nicht beendet werden.'
      );
    } finally {
      setOperationPending(false);
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
        pending={operationPending || create.isPending || finish.isPending}
        onPress={() => void (sessionId ? stop() : start())}
      />
    </Card>
  );
}

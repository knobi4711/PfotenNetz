'use client';

import {
  getSupabaseClient,
  insertTrackingPoints,
  useCreateTrackingSession,
  useFinishTrackingSession,
} from '@pfotennetz/supabase';
import { useRef, useState } from 'react';

type Point = { latitude: number; longitude: number; accuracy: number; timestamp: number };

function distance(a: Point, b: Point): number {
  const earth = 6371000;
  const lat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const lon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const first = (a.latitude * Math.PI) / 180;
  const second = (b.latitude * Math.PI) / 180;
  const value =
    Math.sin(lat / 2) ** 2 + Math.cos(first) * Math.cos(second) * Math.sin(lon / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function WebTrackingRecorder({ bookingId }: { bookingId: string }) {
  const create = useCreateTrackingSession();
  const finish = useFinishTrackingSession();
  const watch = useRef<number | null>(null);
  const previous = useRef<Point | null>(null);
  const startedAt = useRef<number | null>(null);
  const sessionId = useRef<string | null>(null);
  const [active, setActive] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setActive(false);
    if (sessionId.current && startedAt.current) {
      finish.mutate({
        sessionId: sessionId.current,
        distanceMeters,
        durationSeconds: (Date.now() - startedAt.current) / 1000,
      });
    }
    sessionId.current = null;
    startedAt.current = null;
    previous.current = null;
  };

  const start = async () => {
    setError(null);
    if (!navigator.geolocation)
      return setError('Dieser Browser unterstützt keine Standortaufzeichnung.');
    try {
      const session = await create.mutateAsync(bookingId);
      sessionId.current = session.id;
      startedAt.current = Date.now();
      setDistanceMeters(0);
      watch.current = navigator.geolocation.watchPosition(
        (position) => {
          const point: Point = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          const last = previous.current;
          if (last) setDistanceMeters((current) => current + distance(last, point));
          previous.current = point;
          void insertTrackingPoints(getSupabaseClient(), session.id, [point]).catch(
            (cause: unknown) =>
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'GPS-Position konnte nicht gespeichert werden.'
              )
          );
        },
        () => setError('Standortfreigabe wurde nicht erteilt.'),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
      setActive(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Tracking konnte nicht gestartet werden.');
    }
  };

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-xl font-extrabold">Live-Tracking aufzeichnen</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Der Browser zeichnet deine Position während der Betreuung im Vordergrund auf.
      </p>
      <p className="mt-4 text-2xl font-extrabold text-primary">
        {(distanceMeters / 1000).toFixed(2)} km
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={active ? 'btn-emergency mt-4' : 'btn-primary mt-4'}
        disabled={create.isPending || finish.isPending}
        onClick={() => (active ? stop() : void start())}
      >
        {active ? 'Tracking beenden' : 'Tracking starten'}
      </button>
    </section>
  );
}

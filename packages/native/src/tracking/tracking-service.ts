// PfotenNetz Native Tracking - GPS Tracking Service
// Platform-specific implementation using expo-location and TaskManager
// See Architecture Gate for Foreground/Background architecture

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';

export const TRACKING_TASK = 'pfotennetz-location-tracking';

export interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | undefined;
  heading?: number | undefined;
  altitude?: number | undefined;
  timestamp: number;
}

export interface TrackingConfig {
  desiredAccuracy: Location.Accuracy;
  distanceFilter: number;
  timeInterval: number;
  batchInterval: number;
  maxBatchSize: number;
}

const DEFAULT_CONFIG: TrackingConfig = {
  desiredAccuracy: Location.Accuracy.High,
  distanceFilter: 5,
  timeInterval: 2000,
  batchInterval: 10000,
  maxBatchSize: 50,
};

export interface TrackingCallbacks {
  onPoint?: (point: GPSPoint) => void;
  onBatchSend?: (points: GPSPoint[]) => Promise<void>;
  onError?: (error: Error) => void;
}

// TaskManager task data type for background location tracking
interface LocationTrackingTaskData {
  locations: Location.LocationObject[];
}

// Persistent storage keys for background task state
const TRACKING_STORAGE_KEYS = {
  ACTIVE_SESSION_ID: 'pfotennetz.tracking.session_id',
  SESSION_STATE: 'pfotennetz.tracking.state',
  PENDING_POINTS: 'pfotennetz.tracking.pending_points',
} as const;

type TrackingState = 'idle' | 'foreground' | 'background' | 'paused';

// ----- Background Task Definition (MODULE LEVEL - REQUIRED) -----
// This MUST be at module level, not inside a class method
TaskManager.defineTask<LocationTrackingTaskData>(TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Tracking task error:', error);
    return;
  }

  if (data?.locations) {
    await handleBackgroundLocations(data.locations);
  }
});

// Background location handler - runs in separate JS context
async function handleBackgroundLocations(locations: Location.LocationObject[]): Promise<void> {
  try {
    // Read current session ID from persistent storage
    const sessionId = await SecureStore.getItemAsync(TRACKING_STORAGE_KEYS.ACTIVE_SESSION_ID);
    if (!sessionId) {
      console.warn('Background tracking: no active session ID');
      return;
    }

    // Convert to GPS points
    const points: GPSPoint[] = locations.map((loc) => ({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
      speed: loc.coords.speed ?? undefined,
      heading: loc.coords.heading ?? undefined,
      altitude: loc.coords.altitude ?? undefined,
      timestamp: loc.timestamp,
    }));

    // Filter: accuracy check + minimum distance (5m)
    const filteredPoints = points.filter((p) => p.accuracy <= 50);

    if (filteredPoints.length === 0) return;

    // Persist to pending points queue (append to existing)
    const existingPointsJson = await SecureStore.getItemAsync(TRACKING_STORAGE_KEYS.PENDING_POINTS);
    const existingPoints: GPSPoint[] = existingPointsJson ? JSON.parse(existingPointsJson) : [];
    const updatedPoints = [...existingPoints, ...filteredPoints];

    // Limit queue size to prevent storage issues
    const MAX_QUEUE_SIZE = 1000;
    const finalPoints = updatedPoints.slice(-MAX_QUEUE_SIZE);

    await SecureStore.setItemAsync(
      TRACKING_STORAGE_KEYS.PENDING_POINTS,
      JSON.stringify(finalPoints)
    );

    console.log(
      'Background tracking: stored',
      filteredPoints.length,
      'points, queue size:',
      finalPoints.length
    );
  } catch (err) {
    console.error('handleBackgroundLocations error:', err);
  }
}

// ----- Foreground Service Class -----
export class LiveTrackingService {
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private buffer: GPSPoint[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private config: TrackingConfig;
  private currentSessionId: string | null = null;
  private currentState: TrackingState = 'idle';

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async startForeground(callbacks: TrackingCallbacks): Promise<string> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('LOCATION_PERMISSION_DENIED');

    // Generate session ID and persist
    this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.currentState = 'foreground';
    await SecureStore.setItemAsync(TRACKING_STORAGE_KEYS.ACTIVE_SESSION_ID, this.currentSessionId);
    await SecureStore.setItemAsync(TRACKING_STORAGE_KEYS.SESSION_STATE, 'foreground');

    this.foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: this.config.desiredAccuracy,
        timeInterval: this.config.timeInterval,
        // distanceFilter is deprecated for foreground watching
      },
      (location) => this.handleLocation(location, callbacks)
    );

    this.startBatchTimer(callbacks.onBatchSend);
    return this.currentSessionId;
  }

  async startBackground(sessionId: string): Promise<void> {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') throw new Error('BACKGROUND_LOCATION_PERMISSION_DENIED');

    this.currentSessionId = sessionId;
    this.currentState = 'background';
    await SecureStore.setItemAsync(TRACKING_STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);
    await SecureStore.setItemAsync(TRACKING_STORAGE_KEYS.SESSION_STATE, 'background');

    // Task is already defined at module level
    await Location.startLocationUpdatesAsync(TRACKING_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // Use distanceInterval instead of distanceFilter
      timeInterval: 5000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'PfotenNetz Tracking',
        notificationBody: 'Live-Gassi wird aufgezeichnet...',
      },
    });
  }

  private handleLocation(location: Location.LocationObject, callbacks: TrackingCallbacks): void {
    const point: GPSPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? 0,
      speed: location.coords.speed ?? undefined,
      heading: location.coords.heading ?? undefined,
      altitude: location.coords.altitude ?? undefined,
      timestamp: location.timestamp,
    };

    // Filter: accuracy check + minimum distance
    if (point.accuracy <= 50 || this.shouldRecordByDistance(point)) {
      this.buffer.push(point);
      callbacks.onPoint?.(point);
    }

    if (this.buffer.length >= this.config.maxBatchSize) {
      void this.flushBatch(callbacks.onBatchSend).catch((error: unknown) => {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  private shouldRecordByDistance(point: GPSPoint): boolean {
    if (this.buffer.length === 0) return true;
    const last = this.buffer[this.buffer.length - 1]!;
    const distance = this.haversineDistance(last, point);
    return distance >= 5; // 5 meters minimum
  }

  private haversineDistance(p1: GPSPoint, p2: GPSPoint): number {
    const R = 6371000;
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private startBatchTimer(onBatchSend?: (points: GPSPoint[]) => Promise<void>): void {
    this.batchTimer = setInterval(() => this.flushBatch(onBatchSend), this.config.batchInterval);
  }

  private async flushBatch(onBatchSend?: (points: GPSPoint[]) => Promise<void>): Promise<void> {
    if (this.buffer.length === 0 || !onBatchSend) return;
    const batch = [...this.buffer];
    this.buffer = [];
    try {
      await onBatchSend(batch);
    } catch {
      // On failure, re-queue points for retry
      this.buffer.unshift(...batch);
    }
  }

  async stop(): Promise<void> {
    // Stop foreground tracking
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    // Stop background tracking
    if (this.currentState === 'background') {
      await Location.stopLocationUpdatesAsync(TRACKING_TASK);
    }

    // Clear batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush any remaining buffered points
    await this.flushBatch();

    // Clear persistent state
    this.currentState = 'idle';
    this.currentSessionId = null;
    await SecureStore.deleteItemAsync(TRACKING_STORAGE_KEYS.ACTIVE_SESSION_ID);
    await SecureStore.deleteItemAsync(TRACKING_STORAGE_KEYS.SESSION_STATE);
  }

  // Resume tracking after app restart - checks for persisted session
  async resumeIfNeeded(): Promise<string | null> {
    const sessionId = await SecureStore.getItemAsync(TRACKING_STORAGE_KEYS.ACTIVE_SESSION_ID);
    const state = await SecureStore.getItemAsync(TRACKING_STORAGE_KEYS.SESSION_STATE);

    if (sessionId && state === 'background') {
      // Background tracking was active - restart it
      this.currentSessionId = sessionId;
      this.currentState = 'background';
      await Location.startLocationUpdatesAsync(TRACKING_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'PfotenNetz Tracking',
          notificationBody: 'Live-Gassi wird aufgezeichnet...',
        },
      });
      return sessionId;
    }

    // Foreground session doesn't auto-resume (requires user interaction)
    // But we can check for pending points
    return null;
  }

  // Flush pending offline points to server
  async flushPendingPoints(onBatchSend: (points: GPSPoint[]) => Promise<void>): Promise<number> {
    const pendingJson = await SecureStore.getItemAsync(TRACKING_STORAGE_KEYS.PENDING_POINTS);
    if (!pendingJson) return 0;

    const points: GPSPoint[] = JSON.parse(pendingJson);
    if (points.length === 0) return 0;

    try {
      await onBatchSend(points);
      await SecureStore.deleteItemAsync(TRACKING_STORAGE_KEYS.PENDING_POINTS);
      return points.length;
    } catch (err) {
      console.error('Failed to flush pending points:', err);
      throw err;
    }
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  getState(): TrackingState {
    return this.currentState;
  }
}

// Export singleton instance for convenience
export const trackingService = new LiveTrackingService();

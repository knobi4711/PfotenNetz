import { beforeEach, describe, expect, it, vi } from 'vitest';

const fileState = { exists: false, value: '' };

vi.mock('expo-file-system', () => ({
  Paths: { document: 'document://' },
  File: class MockFile {
    get exists() {
      return fileState.exists;
    }
    create() {
      fileState.exists = true;
    }
    delete() {
      fileState.exists = false;
      fileState.value = '';
    }
    text() {
      return Promise.resolve(fileState.value);
    }
    write(value: string) {
      fileState.exists = true;
      fileState.value = value;
    }
  },
}));

import {
  appendTrackingQueue,
  readTrackingQueue,
  writeTrackingQueue,
  type QueuedTrackingPoint,
} from './tracking-queue';

const point: QueuedTrackingPoint = {
  session_id: 'session-1',
  latitude: 51,
  longitude: 10,
  accuracy_meters: 4,
  speed_mps: null,
  heading_degrees: null,
  altitude_meters: null,
  recorded_at: '2026-10-01T10:00:00.000Z',
  is_batched: false,
};

beforeEach(() => {
  fileState.exists = false;
  fileState.value = '';
});

describe('tracking queue', () => {
  it('persists points and appends new points', async () => {
    await writeTrackingQueue([point]);
    await appendTrackingQueue([{ ...point, longitude: 10.001 }]);

    await expect(readTrackingQueue()).resolves.toEqual([point, { ...point, longitude: 10.001 }]);
  });

  it('deletes the queue when it is empty', async () => {
    await writeTrackingQueue([point]);
    await writeTrackingQueue([]);

    await expect(readTrackingQueue()).resolves.toEqual([]);
    expect(fileState.exists).toBe(false);
  });

  it('recovers from a corrupt queue file', async () => {
    fileState.exists = true;
    fileState.value = '{not-json';

    await expect(readTrackingQueue()).resolves.toEqual([]);
  });
});

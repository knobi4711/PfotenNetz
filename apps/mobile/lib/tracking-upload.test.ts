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

const supabaseMock = vi.hoisted(() => ({
  getSupabaseClient: () => ({}),
  insertTrackingPointRows: vi.fn(),
}));

vi.mock('@pfotennetz/supabase', () => supabaseMock);

import { readTrackingQueue, writeTrackingQueue, type QueuedTrackingPoint } from './tracking-queue';
import { flushTrackingQueue } from './tracking-upload';

function point(sessionId: string, latitude = 51): QueuedTrackingPoint {
  return {
    session_id: sessionId,
    latitude,
    longitude: 10,
    accuracy_meters: 4,
    speed_mps: null,
    heading_degrees: null,
    altitude_meters: null,
    recorded_at: '2026-10-29T10:00:00.000Z',
    is_batched: false,
  };
}

beforeEach(() => {
  fileState.exists = false;
  fileState.value = '';
  supabaseMock.insertTrackingPointRows.mockReset();
  supabaseMock.insertTrackingPointRows.mockResolvedValue(undefined);
});

describe('tracking upload', () => {
  it('sends queued points of the active session and clears the queue', async () => {
    await writeTrackingQueue([point('current'), point('current', 52)]);

    await flushTrackingQueue('current');

    expect(supabaseMock.insertTrackingPointRows).toHaveBeenCalledTimes(1);
    expect(supabaseMock.insertTrackingPointRows).toHaveBeenCalledWith(expect.anything(), [
      point('current'),
      point('current', 52),
    ]);
    await expect(readTrackingQueue()).resolves.toEqual([]);
  });

  it('keeps the active session points when the upload fails', async () => {
    supabaseMock.insertTrackingPointRows.mockRejectedValueOnce(new Error('offline'));
    await writeTrackingQueue([point('current'), point('finished')]);

    await flushTrackingQueue('current');

    // Points of a finished session can never be inserted again, so only the
    // active session keeps its queued points for the next attempt.
    await expect(readTrackingQueue()).resolves.toEqual([point('current')]);
  });

  it('drops points from other sessions', async () => {
    await writeTrackingQueue([point('finished')]);

    await flushTrackingQueue('current');

    expect(supabaseMock.insertTrackingPointRows).not.toHaveBeenCalled();
    await expect(readTrackingQueue()).resolves.toEqual([]);
  });
});

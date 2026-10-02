import { describe, expect, it } from 'vitest';
import { nextGeofenceState } from './geofence-state';

describe('nextGeofenceState', () => {
  it('notifies once when leaving after being inside', () => {
    expect(nextGeofenceState('inside', 'exit')).toEqual({
      state: 'outside',
      shouldNotifyExit: true,
    });
    expect(nextGeofenceState('outside', 'exit')).toEqual({
      state: 'outside',
      shouldNotifyExit: false,
    });
  });

  it('arms the next exit after re-entering', () => {
    expect(nextGeofenceState('outside', 'enter')).toEqual({
      state: 'inside',
      shouldNotifyExit: false,
    });
    expect(nextGeofenceState('inside', 'exit').shouldNotifyExit).toBe(true);
  });
});

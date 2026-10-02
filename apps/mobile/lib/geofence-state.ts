export type GeofenceEvent = 'enter' | 'exit';
export type GeofenceState = 'inside' | 'outside';

export function nextGeofenceState(
  state: GeofenceState,
  event: GeofenceEvent
): { state: GeofenceState; shouldNotifyExit: boolean } {
  if (event === 'enter') return { state: 'inside', shouldNotifyExit: false };
  if (state !== 'inside') return { state: 'outside', shouldNotifyExit: false };
  return { state: 'outside', shouldNotifyExit: true };
}

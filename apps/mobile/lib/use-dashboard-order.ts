import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultDashboardOrder, moveDashboardSection, type DashboardSectionId } from './dashboard';
import {
  cachedDashboardOrder,
  readDashboardOrder,
  resetDashboardOrder,
  saveDashboardOrder,
} from './dashboard-order';

export interface DashboardOrderController {
  order: DashboardSectionId[];
  /** Moves a section and persists the new order for the signed-in account. */
  move: (from: number, to: number) => void;
  /** Restores the default layout and persists it. */
  reset: () => void;
  /** True when the order differs from the default layout. */
  isCustom: boolean;
}

function hasUser(userId: string | null | undefined): userId is string {
  return userId !== null && userId !== undefined && userId.length > 0;
}

/**
 * Keeps the dashboard order in sync with the stored preference of the signed-in
 * account. The cached order is used for the first render so switching tabs does
 * not flash the default layout.
 */
export function useDashboardOrder(userId: string | null | undefined): DashboardOrderController {
  const [order, setOrder] = useState<DashboardSectionId[]>(() => cachedDashboardOrder(userId));

  useEffect(() => {
    let active = true;
    setOrder(cachedDashboardOrder(userId));
    if (!hasUser(userId)) {
      return () => {
        active = false;
      };
    }
    void readDashboardOrder(userId).then((stored) => {
      if (active) setOrder(stored);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const move = useCallback(
    (from: number, to: number) => {
      setOrder((current) => {
        const next = moveDashboardSection(current, from, to);
        if (next.every((id, index) => id === current[index])) return current;
        if (hasUser(userId)) void saveDashboardOrder(userId, next);
        return next;
      });
    },
    [userId]
  );

  const reset = useCallback(() => {
    setOrder([...defaultDashboardOrder]);
    if (hasUser(userId)) void resetDashboardOrder(userId);
  }, [userId]);

  const isCustom = useMemo(
    () => order.some((id, index) => id !== defaultDashboardOrder[index]),
    [order]
  );

  return { order, move, reset, isCustom };
}

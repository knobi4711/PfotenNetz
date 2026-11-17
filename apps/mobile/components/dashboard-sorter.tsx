import {
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type ComponentType,
  type RefObject,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dashboardSectionLabels, type DashboardSectionId } from '../lib/dashboard';
import { appFonts, usePalette } from './ui';

/** Fixed row geometry keeps the drag math (slot offsets) exact. */
const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const ROW_STEP = ROW_HEIGHT + ROW_GAP;

const sectionIcons: Record<
  DashboardSectionId,
  ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  members: 'account-group-outline',
  bookings: 'paw-outline',
  safety: 'shield-alert-outline',
  weather: 'weather-sunny',
  community: 'account-multiple-outline',
  missing: 'map-marker-question-outline',
  timebank: 'hand-heart-outline',
  requests: 'inbox-outline',
};

type GestureScrollRef = RefObject<ComponentType | null>;

export function DashboardSectionSorter({
  order,
  onReorder,
  scrollRef,
}: {
  order: DashboardSectionId[];
  /** Called once a drag finished with the section's old and new index. */
  onReorder: (from: number, to: number) => void;
  /** Outer scroll view that must not scroll while a row is dragged. */
  scrollRef?: RefObject<unknown> | undefined;
}) {
  const activeIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const dragOffset = useSharedValue(0);
  // Guards the settle animation of an older drag against a newer one.
  const dragId = useSharedValue(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const startDrag = useCallback((index: number) => {
    setDraggingIndex(index);
  }, []);

  /**
   * Runs after the settle animation. The drag values are reset in the same
   * tick as the new order so rows never jump back to their old slot.
   */
  const commitDrop = useCallback(
    (from: number, to: number) => {
      onReorder(from, to);
      activeIndex.value = -1;
      targetIndex.value = -1;
      dragOffset.value = 0;
      setDraggingIndex(null);
    },
    [activeIndex, dragOffset, onReorder, targetIndex]
  );

  const cancelDrag = useCallback(() => {
    activeIndex.value = -1;
    targetIndex.value = -1;
    dragOffset.value = 0;
    setDraggingIndex(null);
  }, [activeIndex, dragOffset, targetIndex]);

  return (
    <View style={styles.list}>
      {order.map((id, index) => (
        <SortableRow
          key={id}
          sectionId={id}
          index={index}
          count={order.length}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          dragOffset={dragOffset}
          dragId={dragId}
          isActive={draggingIndex === index}
          onDragStart={startDrag}
          onDrop={commitDrop}
          onDropCancelled={cancelDrag}
          onReorder={onReorder}
          scrollRef={scrollRef}
        />
      ))}
    </View>
  );
}

function SortableRow({
  sectionId,
  index,
  count,
  activeIndex,
  targetIndex,
  dragOffset,
  dragId,
  isActive,
  onDragStart,
  onDrop,
  onDropCancelled,
  onReorder,
  scrollRef,
}: {
  sectionId: DashboardSectionId;
  index: number;
  count: number;
  activeIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  dragOffset: SharedValue<number>;
  dragId: SharedValue<number>;
  isActive: boolean;
  onDragStart: (index: number) => void;
  onDrop: (from: number, to: number) => void;
  onDropCancelled: () => void;
  onReorder: (from: number, to: number) => void;
  scrollRef?: RefObject<unknown> | undefined;
}) {
  const c = usePalette();
  const label = dashboardSectionLabels[sectionId];

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(2)
      .shouldCancelWhenOutside(false)
      .onStart(() => {
        dragId.value += 1;
        activeIndex.value = index;
        targetIndex.value = index;
        dragOffset.value = 0;
        runOnJS(onDragStart)(index);
      })
      .onUpdate((event) => {
        // Keep the card inside the list and derive the slot it hovers over.
        const min = -index * ROW_STEP;
        const max = (count - 1 - index) * ROW_STEP;
        const offset = Math.min(Math.max(event.translationY, min), max);
        dragOffset.value = offset;
        const target = Math.min(Math.max(index + Math.round(offset / ROW_STEP), 0), count - 1);
        if (target !== targetIndex.value) targetIndex.value = target;
      })
      .onFinalize(() => {
        const from = activeIndex.value;
        const to = targetIndex.value;
        if (from < 0 || to < 0) {
          runOnJS(onDropCancelled)();
          return;
        }
        const id = dragId.value;
        // Let the card settle into its slot before the order is committed.
        dragOffset.value = withTiming((to - from) * ROW_STEP, { duration: 150 }, (finished) => {
          // A newer drag already took over.
          if (dragId.value !== id) return;
          if (!finished || from === to) {
            runOnJS(onDropCancelled)();
            return;
          }
          runOnJS(onDrop)(from, to);
        });
      });

    if (scrollRef === undefined) return pan;
    // The drag owns the gesture, the surrounding scroll view waits for it.
    return pan.blocksExternalGesture(scrollRef as unknown as GestureScrollRef);
  }, [
    activeIndex,
    count,
    dragId,
    dragOffset,
    index,
    onDragStart,
    onDrop,
    onDropCancelled,
    scrollRef,
    targetIndex,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const target = targetIndex.value;
    if (active < 0 || target < 0) {
      return {
        zIndex: 0,
        elevation: 0,
        shadowOpacity: 0,
        transform: [{ translateY: 0 }, { scale: 1 }],
      };
    }
    if (index === active) {
      return {
        zIndex: 2,
        elevation: 8,
        shadowOpacity: 0.2,
        transform: [{ translateY: dragOffset.value }, { scale: 1.02 }],
      };
    }
    let shift = 0;
    if (target > active && index > active && index <= target) shift = -ROW_STEP;
    else if (target < active && index >= target && index < active) shift = ROW_STEP;
    return {
      zIndex: 0,
      elevation: 0,
      shadowOpacity: 0,
      transform: [{ translateY: withTiming(shift, { duration: 140 }) }, { scale: 1 }],
    };
  });

  const moveBy = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= count) return;
      onReorder(index, next);
    },
    [count, index, onReorder]
  );

  return (
    <Animated.View
      style={[
        styles.row,
        {
          backgroundColor: isActive ? c.surfaceContainerHigh : c.surfaceContainerLowest,
          borderColor: isActive ? c.primary : c.outlineVariant,
          shadowColor: c.surfaceTint,
        },
        animatedStyle,
      ]}
    >
      <MaterialCommunityIcons name={sectionIcons[sectionId]} size={20} color={c.primary} />
      <Text numberOfLines={1} style={[styles.label, { color: c.onSurface }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} nach oben verschieben`}
        accessibilityState={{ disabled: index === 0 }}
        disabled={index === 0}
        onPress={() => moveBy(-1)}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons
          name="chevron-up"
          size={20}
          color={index === 0 ? c.outlineVariant : c.onSurfaceVariant}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} nach unten verschieben`}
        accessibilityState={{ disabled: index === count - 1 }}
        disabled={index === count - 1}
        onPress={() => moveBy(1)}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={index === count - 1 ? c.outlineVariant : c.onSurfaceVariant}
        />
      </Pressable>
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${label} verschieben`}
          accessibilityHint="Ziehen hält den Bereich fest. Alternativ mit den Pfeiltasten verschieben."
          accessibilityActions={[
            { name: 'increment', label: 'Nach unten verschieben' },
            { name: 'decrement', label: 'Nach oben verschieben' },
          ]}
          onAccessibilityAction={(event) => {
            moveBy(event.nativeEvent.actionName === 'increment' ? 1 : -1);
          }}
          style={[styles.handle, { backgroundColor: c.surfaceContainerLow }]}
        >
          <MaterialCommunityIcons name="drag-vertical" size={22} color={c.onSurfaceVariant} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  label: { flex: 1, fontFamily: appFonts.semibold, fontSize: 13, lineHeight: 18 },
  iconButton: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 40,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

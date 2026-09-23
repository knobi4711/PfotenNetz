import { Tabs } from 'expo-router/tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { appFonts, usePalette } from '../../components/ui';

// Stitch "PfotenNetz App": Bottom-Navigation (Übersicht, Karte, Anfragen, Profil).
// Abweichung: Der Reiter "Tiere" bleibt bestehen, da Stitch Haustiere nur im
// Dashboard zeigt, die App sie aber als eigenen Bereich mit CRUD führt.
export default function TabLayout() {
  const c = usePalette();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: c.surfaceContainerLowest,
          borderTopColor: c.outlineVariant,
          borderTopWidth: 1,
          height: 70,
          paddingTop: 7,
          paddingBottom: 8,
          shadowColor: c.onSurface,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarItemStyle: {
          flex: 1,
        },
        tabBarLabelStyle: {
          fontFamily: appFonts.semibold,
          fontSize: 10,
          lineHeight: 14,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Übersicht',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Karte',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Anfragen',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Tiere',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="paw" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.color.brandPrimary,
        tabBarInactiveTintColor: theme.color.onSurfaceTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 2,
          fontWeight: '600',
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopColor: theme.color.border,
          borderTopWidth: 0.5,
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.96)',
          elevation: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(255,255,255,0.96)' },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Card',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'card' : 'card-outline'}
              size={size - 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size - 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'gift' : 'gift-outline'}
              size={size - 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: 'Order',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'fast-food' : 'fast-food-outline'}
              size={size - 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size - 2}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

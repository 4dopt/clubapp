import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@/src/theme';
import { useAdminAuth } from '@/src/admin-auth';

export default function AdminTabLayout() {
  const { adminToken, loading } = useAdminAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surface }}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }
  if (!adminToken) return <Redirect href="/(admin)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.color.brandPrimary,
        tabBarInactiveTintColor: theme.color.onSurfaceTertiary,
        tabBarLabelStyle: {
          fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
          marginTop: 2, fontWeight: '600',
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopColor: theme.color.border,
          borderTopWidth: 0.5,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.96)',
          elevation: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.96)' }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'gift' : 'gift-outline'} size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

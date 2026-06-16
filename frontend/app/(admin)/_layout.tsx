import { Stack, Redirect, useSegments } from 'expo-router';
import { useAdminAuth } from '@/src/admin-auth';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/src/theme';

export default function AdminLayout() {
  const { adminToken, loading } = useAdminAuth();
  const segments = useSegments();
  const isOnLogin = segments[segments.length - 1] === 'login';

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surface }}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }
  // Avoid Redirect loop: do not redirect to login if already on the admin login screen
  if (!adminToken && !isOnLogin) return <Redirect href="/(admin)/login" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

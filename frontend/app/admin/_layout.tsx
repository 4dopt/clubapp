import { Slot, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function AdminLayout() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surface }}>
        <ActivityIndicator color={theme.color.brandPrimary} />
      </View>
    );
  }

  if (!token || user?.role !== 'admin') {
    return <Redirect href="/(auth)/login" />;
  }

  return <Slot />;
}

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

export default function Index() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (token) router.replace('/(tabs)');
    else router.replace('/(auth)/login');
  }, [loading, token, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <ActivityIndicator color={theme.color.brandPrimary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

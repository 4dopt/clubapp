import { Redirect } from 'expo-router';

// Helper redirect to admin dashboard
export default function AdminStaffRedirect() {
  return <Redirect href="/admin" />;
}

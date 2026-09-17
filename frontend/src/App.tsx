import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Rewards } from './pages/Rewards';
import { Booking } from './pages/Booking';
import { Profile } from './pages/Profile';

import { AdminDashboard } from './pages/AdminDashboard';
import { AdminScan } from './pages/AdminScan';
import { AdminMembers } from './pages/AdminMembers';
import { AdminRewards } from './pages/AdminRewards';
import { AdminBookings } from './pages/AdminBookings';

import { InstallPwaPrompt } from './components/InstallPwaPrompt';

function ProtectedRoute({ children, roleRequired }: { children: React.ReactNode; roleRequired?: 'admin' | 'member' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-grey)' }}>Loading PlayGolf...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired === 'admin' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <div className="app-viewport">
      {!splashFinished && <SplashScreen onFinish={() => setSplashFinished(true)} />}

      <Header />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Member Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/history" element={<Navigate to="/profile" replace />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scan"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminScan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/members"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminMembers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rewards"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminBookings />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route
            path="*"
            element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />}
          />
        </Routes>
      </main>

      <InstallPwaPrompt />
      <BottomNav />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

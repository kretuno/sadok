import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import Layout from './components/layout/Layout';
import { UpdateNotification } from './components/layout/UpdateNotification';


const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const AboutPage = lazy(() => import('./pages/about/AboutPage'));
const MenuPage = lazy(() => import('./pages/menu/MenuPage'));
const ChildrenPage = lazy(() => import('./pages/children/ChildrenPage'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const PropertyPage = lazy(() => import('./pages/property/PropertyPage'));
const MedicalPage = lazy(() => import('./pages/medical/MedicalPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const PsychologistPage = lazy(() => import('./pages/psychologist/PsychologistPage'));
const UtilitiesPage = lazy(() => import('./pages/utilities/UtilitiesPage'));
const ChatPanel = lazy(() => import('./components/chat/ChatPanel'));

const PageFallback: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="rounded-2xl border border-warm-100 bg-white px-5 py-3 text-sm font-medium text-gray-600 shadow-sm">
      Завантаження сторінки...
    </div>
  </div>
);

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();

  if (!user) {
    return <LoginPage />;
  }

  if (settings?.isExpired) {
    return (
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/settings" />} />
          </Routes>
          <ChatPanel />
        </Suspense>
      </Layout>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/property" element={<PropertyPage />} />
          <Route path="/medical" element={<MedicalPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/psychologist" element={<PsychologistPage />} />
          <Route path="/utilities" element={<UtilitiesPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <ChatPanel />
      </Suspense>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <SocketProvider>
              <MainContent />
              <UpdateNotification />
            </SocketProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;

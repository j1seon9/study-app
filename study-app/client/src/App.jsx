import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PlansPage from './pages/PlansPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import WeeklyTestsPage from './pages/WeeklyTestsPage.jsx';
import MockExamsPage from './pages/MockExamsPage.jsx';
import AiReportPage from './pages/AiReportPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

/**
 * App 루트 컴포넌트
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute>
            <PlansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <RecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <ProtectedRoute>
            <StatsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weekly-tests"
        element={
          <ProtectedRoute>
            <WeeklyTestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mock-exams"
        element={
          <ProtectedRoute>
            <MockExamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-report"
        element={
          <ProtectedRoute>
            <AiReportPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

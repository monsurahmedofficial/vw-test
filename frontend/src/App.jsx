
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KanbanBoard from './pages/KanbanBoard';
import TaskDetail from './pages/TaskDetail';
import Team from './pages/Team';
import StaffDashboard from './pages/StaffDashboard';
import Settings from './pages/Settings';
import ShopPage from './pages/ShopPage';
import AttendancePage from './pages/AttendancePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import RoasterPage from './pages/RoasterPage';

function PrivateRoute({ children, adminOnly = false, managerOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to={user.role === 'hr' ? '/board' : '/my-tasks'} replace />;
  if (managerOnly && !['admin', 'hr'].includes(user.role)) return <Navigate to="/my-tasks" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const defaultHome = user?.role === 'admin' ? '/dashboard' : user?.role === 'hr' ? '/board' : '/my-tasks';
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultHome} /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to={defaultHome} />} />
        <Route path="dashboard"     element={<PrivateRoute adminOnly><Dashboard /></PrivateRoute>} />
        <Route path="board"         element={<PrivateRoute managerOnly><KanbanBoard /></PrivateRoute>} />
        <Route path="my-tasks"      element={<PrivateRoute><StaffDashboard /></PrivateRoute>} />
        <Route path="tasks/:id"     element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
        <Route path="team"          element={<PrivateRoute managerOnly><Team /></PrivateRoute>} />
        <Route path="settings"      element={<PrivateRoute adminOnly><Settings /></PrivateRoute>} />
        <Route path="shop"          element={<PrivateRoute><ShopPage /></PrivateRoute>} />
        <Route path="attendance"    element={<PrivateRoute><AttendancePage /></PrivateRoute>} />
        <Route path="announcements" element={<PrivateRoute><AnnouncementsPage /></PrivateRoute>} />
        <Route path="roaster"       element={<PrivateRoute managerOnly><RoasterPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </AuthProvider>
  );
}

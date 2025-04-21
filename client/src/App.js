import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import MenuManagement from './pages/superadmin/MenuManagement';
import TablesLayout from './pages/superadmin/TablesLayout';
import UserManagement from './pages/superadmin/UserManagement';
import OrderManagement from './pages/superadmin/OrderManagement';
import Analytics from './pages/superadmin/Analytics';
import WaiterDashboard from './pages/waiter/Dashboard';
import TableService from './pages/waiter/TableService';
import OrderCreation from './pages/waiter/OrderCreation';
import Profile from './pages/Profile';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './components/NotFound';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4CAF50',
    },
    secondary: {
      main: '#FFC107',
    },
    error: {
      main: '#F44336',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          {/* SuperAdmin Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                {user?.role === 'superadmin' ? <SuperAdminDashboard /> : <WaiterDashboard />}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/menu" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <MenuManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tables" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <TablesLayout />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/users" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <OrderManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/orders/:id" 
            element={
              <ProtectedRoute>
                <OrderManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <Analytics />
              </ProtectedRoute>
            } 
          />
          
          {/* Waiter Routes */}
          <Route 
            path="/table/:id" 
            element={
              <ProtectedRoute>
                <TableService />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/create-order/:tableId" 
            element={
              <ProtectedRoute>
                <OrderCreation />
              </ProtectedRoute>
            } 
          />
          
          {/* Common Routes */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

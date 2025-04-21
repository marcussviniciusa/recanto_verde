import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

// Versão simplificada do layout - abordagem direta
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  
  // Responsive drawer width
  const drawerWidth = user?.role === 'waiter' ? 240 : 280;
  
  // Determine if we're on a mobile page (only for waiters)
  const isMobilePage = user?.role === 'waiter' && 
    (location.pathname.startsWith('/table/') || 
     location.pathname.startsWith('/create-order/'));
  
  // Toggle drawer
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      <Header 
        drawerWidth={drawerWidth} 
        open={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isMobilePage={isMobilePage}
      />
      
      <Sidebar 
        drawerWidth={drawerWidth} 
        open={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        variant="permanent"
        isMobilePage={isMobilePage}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          mt: '64px'  // Altura do AppBar
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;

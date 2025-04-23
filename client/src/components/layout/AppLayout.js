import React, { useState } from 'react';
import { Box, CssBaseline, Fab, Tooltip } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

// Versão simplificada do layout - abordagem direta
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  // Definir o valor inicial do sidebarOpen com base no papel do usuário
  // Para garçons o menu começa fechado, para outros papéis começa aberto
  const [sidebarOpen, setSidebarOpen] = useState(user?.role !== 'waiter');
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

  const navigate = useNavigate();
  
  // Função para navegar para a página principal das mesas
  const goToDashboard = () => {
    navigate('/');
  };
  
  return (
    <Box sx={{ display: 'flex', position: 'relative' }}>
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
        
        {/* Botão flutuante para garçons irem para a página principal */}
        {user?.role === 'waiter' && !location.pathname.endsWith('/') && (
          <Tooltip title="Ir para Mesas" placement="left">
            <Fab 
              color="primary" 
              aria-label="ir para mesas" 
              onClick={goToDashboard}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
              }}
            >
              <TableRestaurantIcon />
            </Fab>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default AppLayout;

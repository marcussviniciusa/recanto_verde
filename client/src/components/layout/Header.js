import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Menu, 
  MenuItem, 
  Box,
  Avatar,
  ListItemIcon,
  Divider,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationList from '../notifications/NotificationList';

const Header = ({ drawerWidth, open, toggleSidebar, isMobilePage }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Menu states
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  
  // Handle user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Handle notifications menu
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };
  
  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Handle profile
  const handleProfile = () => {
    navigate('/profile');
    handleUserMenuClose();
  };
  
  // Go back handler for mobile pages
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') {
      return user?.role === 'superadmin' ? 'Dashboard' : 'Mesas';
    }
    
    if (path.startsWith('/table/')) {
      const tableId = path.split('/')[2];
      return `Mesa ${tableId}`;
    }
    
    if (path.startsWith('/create-order/')) {
      return 'Novo Pedido';
    }
    
    if (path === '/menu') return 'Cardápio';
    if (path === '/tables') return 'Layout de Mesas';
    if (path === '/users') return 'Usuários';
    if (path === '/orders') return 'Pedidos';
    if (path === '/analytics') return 'Análises';
    if (path === '/profile') return 'Perfil';
    
    return 'Recanto Verde';
  };
  
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'white',
        color: 'primary.main',
        boxShadow: 1
      }}
    >
      <Toolbar>
        {isMobilePage ? (
          <IconButton
            color="inherit"
            aria-label="voltar"
            edge="start"
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
        ) : (
          <IconButton
            color="inherit"
            aria-label="abrir menu"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2, display: { xs: 'block', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>
        
        {/* Notifications */}
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Notificações">
            <IconButton
              color="inherit"
              onClick={handleNotificationsOpen}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* User menu */}
          <Tooltip title="Conta">
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleUserMenuOpen}
              sx={{ ml: 1 }}
            >
              {user?.avatar ? (
                <Avatar 
                  src={user.avatar} 
                  alt={user.name}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
      
      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        id="user-menu"
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 2,
          sx: { 
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.16))',
            mt: 1.5,
            width: 220,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
      >
        <MenuItem dense sx={{ py: 1 }}>
          <Avatar />
          <Box sx={{ ml: 1 }}>
            <Typography variant="subtitle2" noWrap>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.role === 'superadmin' ? 'Administrador' : 'Garçom'}
            </Typography>
          </Box>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Meu Perfil
        </MenuItem>
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchor}
        id="notifications-menu"
        open={Boolean(notificationsAnchor)}
        onClose={handleNotificationsClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 2,
          sx: { 
            maxHeight: 400,
            width: 320,
            maxWidth: '100%',
            mt: 1.5
          },
        }}
      >
        <NotificationList onClose={handleNotificationsClose} />
      </Menu>
    </AppBar>
  );
};

export default Header;

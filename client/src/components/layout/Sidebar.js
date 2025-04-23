import React from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Box, 
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Toolbar
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InsightsIcon from '@mui/icons-material/Insights';
import PaymentIcon from '@mui/icons-material/Payment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ drawerWidth, open, toggleSidebar, isMobilePage }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Don't show sidebar on mobile waiter pages at all
  if (isMobilePage && isMobile) {
    return null;
  }
  
  // Drawer variant based on screen size
  const drawerVariant = isMobile ? 'temporary' : 'permanent';
  
  // Navigation items
  const superadminNavItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/' 
    },
    { 
      text: 'Cardápio', 
      icon: <MenuBookIcon />, 
      path: '/menu' 
    },
    { 
      text: 'Mesas', 
      icon: <TableRestaurantIcon />, 
      path: '/tables' 
    },
    { 
      text: 'Garçons', 
      icon: <PeopleIcon />, 
      path: '/users' 
    },
    { 
      text: 'Pedidos', 
      icon: <ReceiptIcon />, 
      path: '/orders' 
    },
    { 
      text: 'Pagamentos', 
      icon: <PaymentIcon />, 
      path: '/payments' 
    },
    { 
      text: 'Análises', 
      icon: <InsightsIcon />, 
      path: '/analytics' 
    }
  ];
  
  const waiterNavItems = [
    { 
      text: 'Mesas', 
      icon: <TableRestaurantIcon />, 
      path: '/' 
    },
    { 
      text: 'Cardápio', 
      icon: <MenuBookIcon />, 
      path: '/menu' 
    },
    { 
      text: 'Pagamentos', 
      icon: <PaymentIcon />, 
      path: '/payments' 
    }
  ];
  
  // Choose navigation based on user role
  const navItems = user?.role === 'superadmin' ? superadminNavItems : waiterNavItems;
  
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      toggleSidebar();
    }
  };
  
  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        }
      }}
      variant={drawerVariant}
      anchor="left"
      open={open}
      onClose={toggleSidebar}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: [1],
        py: 1.5
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RestaurantIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1.1
            }}
          >
            Recanto Verde
            <Typography 
              component="span" 
              variant="caption" 
              sx={{ fontWeight: 'normal', color: 'text.secondary' }}
            >
              {user?.role === 'superadmin' ? 'Administração' : 'Atendimento'}
            </Typography>
          </Typography>
        </Box>
        
        {isMobile && (
          <IconButton onClick={toggleSidebar}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      
      <Divider />
      
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
            sx={{
              mb: 0.5,
              px: 2,
              borderRadius: 1,
              mx: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                color: 'primary.dark',
                '&:hover': {
                  bgcolor: 'primary.light',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.dark',
                },
              },
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          © {new Date().getFullYear()} Recanto Verde
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          v1.0.0
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;

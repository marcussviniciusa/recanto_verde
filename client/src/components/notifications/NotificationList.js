import React from 'react';
import { 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Box,
  Divider,
  Button,
  IconButton
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationList = ({ onClose }) => {
  const { notifications, markAsRead, clearNotifications } = useSocket();
  const navigate = useNavigate();

  // Format notification time
  const formatTime = (timestamp) => {
    if (isToday(new Date(timestamp))) {
      return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
    }
    return format(new Date(timestamp), 'dd/MM - HH:mm', { locale: ptBR });
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'table':
        return <TableRestaurantIcon color="primary" />;
      case 'order':
        return <RestaurantMenuIcon color="secondary" />;
      case 'ready':
        return <CheckCircleIcon color="success" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'table' && notification.data?.tableId) {
      navigate(`/table/${notification.data.tableId}`);
    } else if (notification.type === 'order' && notification.data?.orderId) {
      navigate(`/orders/${notification.data.orderId}`);
    } else if (notification.type === 'ready' && notification.data?.tableId) {
      navigate(`/table/${notification.data.tableId}`);
    }
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Typography variant="h6">
          Notificações
        </Typography>
        <IconButton 
          size="small" 
          title="Limpar todas"
          onClick={clearNotifications}
          disabled={notifications.length === 0}
        >
          <ClearAllIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhuma notificação
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {notifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem 
                button 
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification)}
                sx={{ 
                  bgcolor: notification.read ? 'transparent' : 'rgba(76, 175, 80, 0.08)',
                  '&:hover': {
                    bgcolor: notification.read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(76, 175, 80, 0.12)',
                  },
                  px: 2,
                  py: 1.5
                }}
              >
                <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      component="div" 
                      sx={{ 
                        fontWeight: notification.read ? 'normal' : 'bold',
                        mb: 0.5 
                      }}
                    >
                      {notification.message}
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                    >
                      {formatTime(notification.timestamp)}
                    </Typography>
                  }
                />
              </ListItem>
              {index < notifications.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
      
      {notifications.length > 0 && (
        <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Button 
            size="small"
            color="primary"
            onClick={clearNotifications}
          >
            Limpar Todas
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default NotificationList;

import React, { useState } from 'react';
import { 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Box,
  Divider,
  Button,
  IconButton,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import PaymentIcon from '@mui/icons-material/Payment';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { format, isToday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationList = ({ onClose }) => {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead,
    clearNotifications, 
    deleteNotification,
    soundEnabled,
    toggleSound
  } = useSocket();
  const navigate = useNavigate();
  
  // Estado para controle das tabs
  const [currentTab, setCurrentTab] = useState(0);
  
  // Filtrar notificações com base na tab atual
  const getFilteredNotifications = () => {
    switch(currentTab) {
      case 0: // Todas
        return notifications;
      case 1: // Não lidas
        return notifications.filter(n => !n.read);
      case 2: // Mesas
        return notifications.filter(n => n.type === 'table' || n.type === 'tableStatus');
      case 3: // Pedidos
        return notifications.filter(n => n.type === 'order' || n.type === 'ready');
      case 4: // Pagamentos
        return notifications.filter(n => n.type === 'payment');
      default:
        return notifications;
    }
  };
  
  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Contadores por tipo
  const getTypeCounts = () => {
    return {
      tables: notifications.filter(n => (n.type === 'table' || n.type === 'tableStatus') && !n.read).length,
      orders: notifications.filter(n => (n.type === 'order' || n.type === 'ready') && !n.read).length,
      payments: notifications.filter(n => n.type === 'payment' && !n.read).length
    };
  };
  
  const typeCounts = getTypeCounts();

  // Format notification time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    
    // Para notificações recentes (menos de 1h), mostrar "há X minutos"
    if (Date.now() - date.getTime() < 60 * 60 * 1000) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    }
    
    // Para hoje, mostrar apenas a hora
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    }
    
    // Para outras datas, mostrar dia e hora
    return format(date, 'dd/MM - HH:mm', { locale: ptBR });
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'table':
      case 'tableStatus':
        return <TableRestaurantIcon color="primary" />;
      case 'order':
        return <RestaurantMenuIcon color="secondary" />;
      case 'ready':
        return <CheckCircleIcon color="success" />;
      case 'payment':
        return <PaymentIcon color="info" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if ((notification.type === 'table' || notification.type === 'tableStatus' || notification.type === 'ready') 
        && notification.data?.tableId) {
      navigate(`/table/${notification.data.tableId}`);
    } else if (notification.type === 'order' && notification.data?.orderId) {
      navigate(`/orders/${notification.data.orderId}`);
    } else if (notification.type === 'payment' && notification.data?.tableId) {
      navigate(`/payment-requests`);
    }
    
    if (onClose) {
      onClose();
    }
  };
  
  // Troca de tab
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Deletar uma notificação específica
  const handleDeleteNotification = (event, id) => {
    event.stopPropagation();
    deleteNotification(id);
  };

  return (
    <Box sx={{ width: 320, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho com título e ações */}
      <Box sx={{ 
        p: 1.5, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        bgcolor: 'background.paper'
      }}>
        <Typography variant="h6">
          Notificações
          {unreadCount > 0 && (
            <Chip 
              label={unreadCount} 
              color="primary" 
              size="small"
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Typography>
        <Box>
          <Tooltip title={soundEnabled ? "Desativar som" : "Ativar som"}>
            <IconButton size="small" onClick={toggleSound}>
              {soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" color="disabled" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Marcar todas como lidas">
            <IconButton 
              size="small" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              sx={{ ml: 0.5 }}
            >
              <DoneAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Limpar todas">
            <IconButton 
              size="small" 
              onClick={clearNotifications}
              disabled={notifications.length === 0}
              sx={{ ml: 0.5 }}
            >
              <ClearAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Tabs para filtragem */}
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
      >
        <Tab 
          label="Todas" 
          sx={{ minHeight: 40, py: 0 }} 
          id="notifications-tab-0"
          aria-controls="notifications-tabpanel-0"
        />
        <Tab 
          label={<Badge badgeContent={unreadCount} color="primary">
            Não lidas
          </Badge>} 
          sx={{ minHeight: 40, py: 0 }} 
          id="notifications-tab-1"
          aria-controls="notifications-tabpanel-1"
        />
        <Tab 
          label={<Badge badgeContent={typeCounts.tables} color="primary">
            Mesas
          </Badge>} 
          sx={{ minHeight: 40, py: 0 }} 
          id="notifications-tab-2"
          aria-controls="notifications-tabpanel-2"
        />
        <Tab 
          label={<Badge badgeContent={typeCounts.orders} color="primary">
            Pedidos
          </Badge>} 
          sx={{ minHeight: 40, py: 0 }} 
          id="notifications-tab-3"
          aria-controls="notifications-tabpanel-3"
        />
        <Tab 
          label={<Badge badgeContent={typeCounts.payments} color="primary">
            Pagamentos
          </Badge>} 
          sx={{ minHeight: 40, py: 0 }} 
          id="notifications-tab-4"
          aria-controls="notifications-tabpanel-4"
        />
      </Tabs>
      
      {/* Lista de notificações */}
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        {filteredNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Nenhuma notificação {currentTab === 1 ? 'não lida' : ''}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  button 
                  alignItems="flex-start"
                  onClick={() => handleNotificationClick(notification)}
                  sx={{ 
                    bgcolor: notification.read ? 'transparent' : 
                      notification.priority === 'high' ? 'rgba(255, 152, 0, 0.12)' : 'rgba(76, 175, 80, 0.08)',
                    '&:hover': {
                      bgcolor: notification.read ? 'rgba(0, 0, 0, 0.04)' : 
                        notification.priority === 'high' ? 'rgba(255, 152, 0, 0.18)' : 'rgba(76, 175, 80, 0.12)',
                    },
                    px: 1.5,
                    py: 1,
                    borderLeft: notification.priority === 'high' ? '3px solid #ff9800' : 'none'
                  }}
                >
                  <ListItemIcon sx={{ mt: 0.5, minWidth: 38 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                        >
                          {formatTime(notification.timestamp)}
                        </Typography>
                        <IconButton 
                          size="small" 
                          edge="end"
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          sx={{ ml: 1, p: 0.3 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
      
      {/* Rodapé com ações */}
      {notifications.length > 0 && (
        <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'background.paper' }}>
          <Button 
            size="small"
            color="primary"
            startIcon={<ClearAllIcon />}
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

import React from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Chip, 
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

const OrdersList = ({ orders = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Format order time
  const formatTime = (createdAt) => {
    if (isToday(new Date(createdAt))) {
      return format(new Date(createdAt), 'HH:mm', { locale: ptBR });
    }
    return format(new Date(createdAt), 'dd/MM - HH:mm', { locale: ptBR });
  };
  
  // Get chip color based on status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'preparing':
        return 'info';
      case 'ready':
        return 'success';
      case 'delivered':
        return 'secondary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Format order status text
  const formatStatus = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Pronto';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };
  
  // Handle order click - navigate to order details
  const handleOrderClick = (orderId) => {
    if (user.role === 'superadmin') {
      navigate(`/orders/${orderId}`);
    } else {
      // For waiters, navigate to the associated table
      const order = orders.find(o => o._id === orderId);
      if (order && order.table) {
        navigate(`/table/${order.table._id}`);
      }
    }
  };
  
  // Calculate time elapsed
  const getTimeElapsed = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h${mins}min`;
    }
  };

  if (orders.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 200,
        p: 2 
      }}>
        <ReceiptIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
        <Typography color="text.secondary">
          Nenhum pedido ativo
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', p: 0 }}>
      {orders.map((order, index) => (
        <React.Fragment key={order._id}>
          <ListItem
            alignItems="flex-start"
            secondaryAction={
              <Tooltip title="Ver detalhes">
                <IconButton 
                  edge="end" 
                  aria-label="ver detalhes"
                  onClick={() => handleOrderClick(order._id)}
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            }
            sx={{ 
              px: 1, 
              py: 1.5,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" component="span">
                    Mesa {order.table?.tableNumber || '?'}
                  </Typography>
                  <Chip 
                    label={formatStatus(order.status)} 
                    color={getStatusColor(order.status)}
                    size="small"
                    sx={{ ml: 1, height: 20 }}
                  />
                </Box>
              }
              secondary={
                <Box>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    component="span"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} • R$ {order.totalAmount.toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Box display="flex" alignItems="center">
                      <RestaurantIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(order.createdAt)} ({getTimeElapsed(order.createdAt)})
                      </Typography>
                    </Box>
                    {order.waiter && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        Garçom: {order.waiter.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              }
            />
          </ListItem>
          {index < orders.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default OrdersList;

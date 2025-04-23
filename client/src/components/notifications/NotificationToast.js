import React, { useState, useEffect } from 'react';
import { 
  Snackbar, 
  Alert, 
  Typography, 
  IconButton, 
  Box,
  Slide
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PaymentIcon from '@mui/icons-material/Payment';
import { useNavigate } from 'react-router-dom';

// Componente para exibir notificações como toast na tela
const NotificationToast = ({ notification, onClose, autoHideDuration = 6000 }) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  
  // Determinar severiodade com base no tipo de notificação
  const getSeverity = (type) => {
    switch (type) {
      case 'ready':
        return 'success';
      case 'order':
        return 'info';
      case 'table':
      case 'tableStatus':
        return 'info';
      case 'payment':
        return 'warning';
      default:
        return 'info';
    }
  };
  
  // Obter ícone com base no tipo de notificação
  const getIcon = (type) => {
    switch (type) {
      case 'ready':
        return <CheckCircleIcon />;
      case 'order':
        return <RestaurantMenuIcon />;
      case 'table':
      case 'tableStatus':
        return <TableRestaurantIcon />;
      case 'payment':
        return <PaymentIcon />;
      default:
        return null;
    }
  };
  
  // Manipular o fechamento do toast
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    if (onClose) {
      onClose(notification.id);
    }
  };
  
  // Manipular o clique no toast (navegar para a página relevante)
  const handleClick = () => {
    if (notification.type === 'ready' || notification.type === 'table' || notification.type === 'tableStatus') {
      if (notification.data?.tableId) {
        navigate(`/table/${notification.data.tableId}`);
      }
    } else if (notification.type === 'order') {
      if (notification.data?.orderId) {
        navigate(`/orders/${notification.data.orderId}`);
      }
    } else if (notification.type === 'payment') {
      navigate('/payment-requests');
    }
    
    handleClose();
  };

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      TransitionComponent={Slide}
      sx={{ mb: 3 }}
    >
      <Alert
        severity={getSeverity(notification.type)}
        icon={getIcon(notification.type)}
        variant="filled"
        sx={{ 
          width: '100%', 
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.9
          } 
        }}
        onClick={handleClick}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={(e) => {
              e.stopPropagation();
              handleClose(e);
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Typography variant="body2">{notification.message}</Typography>
      </Alert>
    </Snackbar>
  );
};

export default NotificationToast;

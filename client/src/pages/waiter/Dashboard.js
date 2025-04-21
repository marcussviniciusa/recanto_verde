import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PersonIcon from '@mui/icons-material/Person';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import AppLayout from '../../components/layout/AppLayout';

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { notifications } = useSocket();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Load tables and active orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch tables
        const tablesResponse = await axios.get('/api/tables');
        setTables(tablesResponse.data);
        
        // Fetch active orders
        const ordersResponse = await axios.get('/api/orders/status/active');
        setActiveOrders(ordersResponse.data);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Listen for notification updates
  useEffect(() => {
    // Refresh data when relevant notifications arrive
    if (notifications.some(n => !n.read && (n.type === 'table' || n.type === 'ready'))) {
      const fetchData = async () => {
        try {
          // Fetch tables
          const tablesResponse = await axios.get('/api/tables');
          setTables(tablesResponse.data);
          
          // Fetch active orders
          const ordersResponse = await axios.get('/api/orders/status/active');
          setActiveOrders(ordersResponse.data);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };
      
      fetchData();
    }
  }, [notifications]);

  // Navigate to table service page
  const handleTableClick = (tableId) => {
    navigate(`/table/${tableId}`);
  };
  
  // Get table status class
  const getTableStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'table-available';
      case 'occupied':
        return 'table-occupied';
      case 'reserved':
        return 'table-reserved';
      default:
        return '';
    }
  };
  
  // Get table status text
  const getTableStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'occupied':
        return 'Ocupada';
      case 'reserved':
        return 'Reservada';
      default:
        return status;
    }
  };
  
  // Group tables by section
  const groupedTables = tables.reduce((acc, table) => {
    const section = table.section || 'main';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(table);
    return acc;
  }, {});
  
  // Sort tables by number within each section
  Object.keys(groupedTables).forEach(section => {
    groupedTables[section].sort((a, b) => a.tableNumber - b.tableNumber);
  });
  
  // Get order count for a table
  const getOrderCount = (tableId) => {
    return activeOrders.filter(order => order.table._id === tableId).length;
  };
  
  // Get notification count for a table
  const getTableNotifications = (tableId) => {
    return notifications.filter(
      n => !n.read && (n.type === 'ready' || n.type === 'order') && n.data?.tableId === tableId
    ).length;
  };

  if (loading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Mesas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Selecione uma mesa para iniciar ou gerenciar um atendimento
        </Typography>
      </Box>
      
      {/* Tables grouped by section */}
      {Object.keys(groupedTables).length === 0 ? (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200
          }}
        >
          <TableRestaurantIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma mesa configurada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Contate o administrador para configurar mesas
          </Typography>
        </Paper>
      ) : (
        Object.keys(groupedTables).map(section => (
          <Box key={section} sx={{ mb: 4 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                textTransform: 'capitalize',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <TableRestaurantIcon sx={{ mr: 1 }} />
              {section === 'main' ? 'Área Principal' : section}
            </Typography>
            
            <Grid container spacing={2}>
              {groupedTables[section].map(table => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={table._id}>
                  <Card 
                    elevation={2}
                    className={getTableStatusClass(table.status)}
                    onClick={() => handleTableClick(table._id)}
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.03)',
                      },
                      position: 'relative',
                      height: '100%'
                    }}
                  >
                    {getTableNotifications(table._id) > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          bgcolor: 'error.main',
                          color: 'white',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 1
                        }}
                      >
                        {getTableNotifications(table._id)}
                      </Box>
                    )}
                    
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                          {table.tableNumber}
                        </Typography>
                        <Chip 
                          label={getTableStatusText(table.status)} 
                          size="small"
                          color={table.status === 'available' ? 'success' : 'default'}
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: 20,
                            bgcolor: table.status === 'available' ? 'success.light' : 
                                   table.status === 'occupied' ? 'warning.light' : 'grey.300',
                            color: table.status === 'available' ? 'success.dark' : 
                                 table.status === 'occupied' ? 'warning.dark' : 'grey.700'
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PersonIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.text.secondary }} />
                        <Typography variant="body2" color="text.secondary">
                          {table.capacity} pessoas
                        </Typography>
                      </Box>
                      
                      {table.status === 'occupied' && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ReceiptIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.text.secondary }} />
                          <Typography variant="body2" color="text.secondary">
                            {getOrderCount(table._id)} pedidos
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
      
      {/* Recent Order Notifications */}
      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notificações Recentes
        </Typography>
        
        {notifications.filter(n => !n.read && n.type === 'ready').length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            Nenhuma notificação pendente
          </Typography>
        ) : (
          <Box>
            {notifications
              .filter(n => !n.read && n.type === 'ready')
              .slice(0, 5)
              .map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <Box 
                    sx={{ 
                      py: 1.5, 
                      display: 'flex', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                    onClick={() => navigate(`/table/${notification.data?.tableId}`)}
                  >
                    <RestaurantMenuIcon color="success" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="body2">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Toque para ver detalhes
                      </Typography>
                    </Box>
                  </Box>
                  {index < notifications.filter(n => !n.read && n.type === 'ready').slice(0, 5).length - 1 && (
                    <Divider />
                  )}
                </React.Fragment>
              ))}
          </Box>
        )}
      </Paper>
    </AppLayout>
  );
};

export default WaiterDashboard;

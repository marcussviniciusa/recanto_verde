import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';

const TableService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emitTableUpdate, emitNewOrder } = useSocket();
  
  const [table, setTable] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [openTableDialog, setOpenTableDialog] = useState(false);
  const [customerCount, setCustomerCount] = useState(1);
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // Fetch table and orders data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch table details
        const tableResponse = await axios.get(`/api/tables/${id}`);
        setTable(tableResponse.data);
        
        // Fetch orders for this table
        const ordersResponse = await axios.get(`/api/orders/table/${id}`);
        setOrders(ordersResponse.data);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError('Erro ao carregar dados da mesa. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [id]);
  
  // Handle table status update
  const updateTableStatus = async (status) => {
    try {
      setError(null);
      
      const response = await axios.put(`/api/tables/${id}`, {
        status,
        assignedWaiter: user._id
      });
      
      setTable(response.data);
      
      // Emit socket event for real-time updates
      emitTableUpdate({
        tableId: id,
        tableNumber: response.data.tableNumber,
        status: response.data.status
      });
      
      return response.data;
    } catch (err) {
      console.error('Error updating table status:', err);
      setError('Erro ao atualizar status da mesa. Tente novamente.');
      throw err;
    }
  };
  
  // Handle opening the table (setting it as occupied)
  const handleOpenTable = async () => {
    setOpenTableDialog(false);
    
    if (customerCount < 1) {
      setError('O número de clientes deve ser pelo menos 1.');
      return;
    }
    
    try {
      const updatedTable = await updateTableStatus('occupied');
      
      // Navigate to order creation
      navigate(`/create-order/${id}`);
    } catch (err) {
      console.error('Error opening table:', err);
    }
  };
  
  // Handle closing the table and requesting payment
  const handleRequestPayment = async () => {
    try {
      setError(null);
      
      // Update all active orders to mark them for payment
      const activeOrders = orders.filter(order => order.status === 'active');
      
      for (const order of activeOrders) {
        await axios.put(`/api/orders/${order._id}`, {
          status: 'completed',
          paymentStatus: 'pending'
        });
      }
      
      // Refresh orders
      const ordersResponse = await axios.get(`/api/orders/table/${id}`);
      setOrders(ordersResponse.data);
      
      // Show confirmation
      setConfirmationDialog({
        open: true,
        title: 'Pagamento Solicitado',
        message: 'Pagamento foi solicitado. A recepção será notificada.',
        onConfirm: () => {
          setConfirmationDialog({ ...confirmationDialog, open: false });
        }
      });
    } catch (err) {
      console.error('Error requesting payment:', err);
      setError('Erro ao solicitar pagamento. Tente novamente.');
    }
  };
  
  // Handle closing the table completely (returning to available status)
  const handleCloseTable = async () => {
    try {
      setError(null);
      
      // Update table status
      await updateTableStatus('available');
      
      // Show confirmation
      setConfirmationDialog({
        open: true,
        title: 'Mesa Liberada',
        message: 'Mesa foi liberada e está disponível para novos clientes.',
        onConfirm: () => {
          setConfirmationDialog({ ...confirmationDialog, open: false });
          navigate('/'); // Return to dashboard
        }
      });
    } catch (err) {
      console.error('Error closing table:', err);
      setError('Erro ao liberar mesa. Tente novamente.');
    }
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };
  
  // Get total for all orders at this table
  const calculateTotal = () => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  };
  
  // Calculate time elapsed since table was occupied
  const getOccupiedTime = () => {
    if (!table?.occupiedAt) return 'N/A';
    
    const now = new Date();
    const occupied = new Date(table.occupiedAt);
    const diffMs = now - occupied;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minutos`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}min`;
    }
  };
  
  // Get order status chip
  const getOrderStatusChip = (status) => {
    let color;
    let label;
    
    switch (status) {
      case 'active':
        color = 'primary';
        label = 'Ativo';
        break;
      case 'completed':
        color = 'success';
        label = 'Completo';
        break;
      case 'cancelled':
        color = 'error';
        label = 'Cancelado';
        break;
      default:
        color = 'default';
        label = status;
    }
    
    return <Chip size="small" color={color} label={label} />;
  };
  
  // Get payment status chip
  const getPaymentStatusChip = (status) => {
    let color;
    let label;
    
    switch (status) {
      case 'pending':
        color = 'warning';
        label = 'Pendente';
        break;
      case 'paid':
        color = 'success';
        label = 'Pago';
        break;
      case 'refunded':
        color = 'info';
        label = 'Reembolsado';
        break;
      default:
        color = 'default';
        label = status;
    }
    
    return <Chip size="small" color={color} label={label} />;
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

  if (!table) {
    return (
      <AppLayout>
        <Alert severity="error">
          Mesa não encontrada. Verifique se o ID está correto.
          <Button onClick={() => navigate('/')} sx={{ ml: 2 }}>
            Voltar ao início
          </Button>
        </Alert>
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
      
      {/* Table Information */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Mesa {table.tableNumber}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Capacidade: {table.capacity} pessoas
                </Typography>
              </Box>
              
              {table.status === 'occupied' && table.occupiedAt && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Tempo: {getOccupiedTime()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          
          <Chip
            label={table.status === 'available' ? 'Disponível' : table.status === 'occupied' ? 'Ocupada' : 'Reservada'}
            color={table.status === 'available' ? 'success' : table.status === 'occupied' ? 'warning' : 'default'}
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {table.status === 'available' ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PeopleIcon />}
              onClick={() => setOpenTableDialog(true)}
            >
              Ocupar Mesa
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<RestaurantMenuIcon />}
                onClick={() => navigate(`/create-order/${id}`)}
              >
                Novo Pedido
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PaymentIcon />}
                onClick={handleRequestPayment}
              >
                Solicitar Pagamento
              </Button>
              
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleCloseTable}
              >
                Liberar Mesa
              </Button>
            </>
          )}
        </Box>
      </Paper>
      
      {/* Orders Section */}
      <Typography variant="h6" gutterBottom>
        Pedidos
      </Typography>
      
      {orders.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" gutterBottom>
            Nenhum pedido para esta mesa
          </Typography>
          {table.status === 'occupied' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/create-order/${id}`)}
              sx={{ mt: 2 }}
            >
              Criar Pedido
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {orders.map(order => (
            <Grid item xs={12} key={order._id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Pedido #{order._id.substring(order._id.length - 6).toUpperCase()}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {getOrderStatusChip(order.status)}
                      {getPaymentStatusChip(order.paymentStatus)}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Criado em: {formatDate(order.createdAt)}
                  </Typography>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Itens:
                  </Typography>
                  
                  {order.items.map(item => (
                    <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {item.quantity}x {item.menuItem.name}
                        {item.specialInstructions && (
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                            ({item.specialInstructions})
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(item.price * item.quantity)}
                      </Typography>
                    </Box>
                  ))}
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">Total:</Typography>
                    <Typography variant="subtitle2">{formatCurrency(order.totalAmount)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {/* Total for all orders */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.dark' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Total da Mesa:</Typography>
                <Typography variant="h6">{formatCurrency(calculateTotal())}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Dialog for Opening Table */}
      <Dialog open={openTableDialog} onClose={() => setOpenTableDialog(false)}>
        <DialogTitle>Ocupar Mesa {table.tableNumber}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Informe a quantidade de clientes para esta mesa.
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <TextField
              label="Número de Clientes"
              type="number"
              value={customerCount}
              onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: table.capacity }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTableDialog(false)}>Cancelar</Button>
          <Button onClick={handleOpenTable} variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog.open} onClose={() => setConfirmationDialog({ ...confirmationDialog, open: false })}>
        <DialogTitle>{confirmationDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmationDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => confirmationDialog.onConfirm && confirmationDialog.onConfirm()} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default TableService;

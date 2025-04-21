import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import PersonIcon from '@mui/icons-material/Person';
import PaymentIcon from '@mui/icons-material/Payment';
import PrintIcon from '@mui/icons-material/Print';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '../../components/layout/AppLayout';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Order details dialog
  const [orderDetailsDialog, setOrderDetailsDialog] = useState({
    open: false,
    order: null
  });
  
  // Status update dialog
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    order: null,
    status: ''
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/orders');
        setOrders(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Erro ao carregar pedidos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);
  
  // Handle status update
  const handleUpdateStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const { order, status } = statusDialog;
      
      const response = await axios.put(`/api/orders/${order._id}`, {
        status
      });
      
      // Update orders in state
      setOrders(orders.map(o => 
        o._id === order._id ? response.data : o
      ));
      
      setSuccess('Status do pedido atualizado com sucesso!');
      
      // Close dialog
      setStatusDialog({
        open: false,
        order: null,
        status: ''
      });
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Erro ao atualizar status do pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle payment status update
  const handleUpdatePaymentStatus = async (order, paymentStatus) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.put(`/api/orders/${order._id}`, {
        paymentStatus
      });
      
      // Update orders in state
      setOrders(orders.map(o => 
        o._id === order._id ? response.data : o
      ));
      
      setSuccess('Status de pagamento atualizado com sucesso!');
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError('Erro ao atualizar status de pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return `R$ ${parseFloat(value).toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return dateString || 'N/A';
    }
  };
  
  // Get status display info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { label: 'Ativo', color: 'primary' };
      case 'completed':
        return { label: 'Completo', color: 'success' };
      case 'cancelled':
        return { label: 'Cancelado', color: 'error' };
      default:
        return { label: status, color: 'default' };
    }
  };
  
  // Get payment status display info
  const getPaymentStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', color: 'warning' };
      case 'paid':
        return { label: 'Pago', color: 'success' };
      case 'refunded':
        return { label: 'Reembolsado', color: 'info' };
      default:
        return { label: status, color: 'default' };
    }
  };
  
  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search term
    const matchesSearch = 
      (order.table?.tableNumber && order.table.tableNumber.toString().includes(searchTerm)) ||
      (order._id && order._id.includes(searchTerm)) ||
      (order.waiter?.name && order.waiter.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    // Payment filter
    const matchesPayment = filterPayment === 'all' || order.paymentStatus === filterPayment;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const orderDate = new Date(order.createdAt);
      matchesDateRange = matchesDateRange && orderDate >= fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      const orderDate = new Date(order.createdAt);
      matchesDateRange = matchesDateRange && orderDate <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDateRange;
  });
  
  // Sort orders by creation date (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  // Paginated orders
  const paginatedOrders = sortedOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gerenciamento de Pedidos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualize e gerencie todos os pedidos do restaurante.
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {/* Search and filter toolbar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Pesquisar por mesa, pedido ou garçom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Ativos</MenuItem>
                <MenuItem value="completed">Completos</MenuItem>
                <MenuItem value="cancelled">Cancelados</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Pagamento</InputLabel>
              <Select
                value={filterPayment}
                label="Pagamento"
                onChange={(e) => setFilterPayment(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
                <MenuItem value="paid">Pago</MenuItem>
                <MenuItem value="refunded">Reembolsado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="De"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Até"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Orders table */}
      <Paper elevation={2}>
        {loading && orders.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 4
          }}>
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              Nenhum pedido encontrado. Tente ajustar os filtros de pesquisa.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 650 }} aria-label="orders table">
                <TableHead>
                  <TableRow>
                    <TableCell>Pedido</TableCell>
                    <TableCell>Mesa</TableCell>
                    <TableCell>Garçom</TableCell>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Pagamento</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell component="th" scope="row">
                        <Typography variant="subtitle2">
                          #{order._id.substring(order._id.length - 6).toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.items.length} itens
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={<TableRestaurantIcon />} 
                          label={`Mesa ${order.table?.tableNumber || '?'}`} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">{order.waiter?.name || 'N/A'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(order.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={getStatusInfo(order.status).label} 
                          color={getStatusInfo(order.status).color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={getPaymentStatusInfo(order.paymentStatus).label} 
                          color={getPaymentStatusInfo(order.paymentStatus).color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => setOrderDetailsDialog({ open: true, order })}
                          title="Ver detalhes"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => setStatusDialog({ 
                            open: true, 
                            order,
                            status: order.status
                          })}
                          title="Alterar status"
                        >
                          <RestaurantIcon fontSize="small" />
                        </IconButton>
                        {order.paymentStatus === 'pending' && (
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleUpdatePaymentStatus(order, 'paid')}
                            title="Marcar como pago"
                          >
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredOrders.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Paper>
      
      {/* Order Details Dialog */}
      <Dialog
        open={orderDetailsDialog.open}
        onClose={() => setOrderDetailsDialog({ open: false, order: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Pedido
        </DialogTitle>
        <DialogContent dividers>
          {orderDetailsDialog.order && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    Pedido #{orderDetailsDialog.order._id.substring(orderDetailsDialog.order._id.length - 6).toUpperCase()}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip 
                      icon={<TableRestaurantIcon />}
                      label={`Mesa ${orderDetailsDialog.order.table?.tableNumber || '?'}`} 
                      variant="outlined"
                    />
                    <Chip 
                      label={getStatusInfo(orderDetailsDialog.order.status).label} 
                      color={getStatusInfo(orderDetailsDialog.order.status).color}
                    />
                    <Chip 
                      label={getPaymentStatusInfo(orderDetailsDialog.order.paymentStatus).label} 
                      color={getPaymentStatusInfo(orderDetailsDialog.order.paymentStatus).color}
                    />
                  </Box>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Atendido por: {orderDetailsDialog.order.waiter?.name || 'N/A'}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Data/Hora: {formatDate(orderDetailsDialog.order.createdAt)}
                  </Typography>
                  
                  {orderDetailsDialog.order.specialRequests && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="subtitle2">Observações Gerais:</Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="body2">
                          {orderDetailsDialog.order.specialRequests}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                    <CardContent>
                      <Typography variant="subtitle2">Total do Pedido:</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(orderDetailsDialog.order.totalAmount)}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Clientes:</span>
                          <span>{orderDetailsDialog.order.customerCount}</span>
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Itens:</span>
                          <span>{orderDetailsDialog.order.items.length}</span>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      size="small"
                    >
                      Imprimir
                    </Button>
                    
                    {orderDetailsDialog.order.status !== 'completed' && (
                      <Button
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        size="small"
                        onClick={() => {
                          setOrderDetailsDialog({ open: false, order: null });
                          setStatusDialog({ 
                            open: true, 
                            order: orderDetailsDialog.order,
                            status: 'completed'
                          });
                        }}
                      >
                        Completar
                      </Button>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Itens do Pedido
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Observações</TableCell>
                          <TableCell align="center">Qtd</TableCell>
                          <TableCell align="right">Preço Unit.</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderDetailsDialog.order.items.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocalDiningIcon sx={{ mr: 1, fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2">
                                  {item.menuItem?.name || 'Item indisponível'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {item.specialInstructions || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">{item.quantity}</TableCell>
                            <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                            <TableCell align="right">{formatCurrency(item.price * item.quantity)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} />
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            Total
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(orderDetailsDialog.order.totalAmount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailsDialog({ open: false, order: null })}>
            Fechar
          </Button>
          {orderDetailsDialog.order && orderDetailsDialog.order.paymentStatus === 'pending' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={() => {
                handleUpdatePaymentStatus(orderDetailsDialog.order, 'paid');
                setOrderDetailsDialog({ open: false, order: null });
              }}
              startIcon={<PaymentIcon />}
            >
              Marcar como Pago
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Status Update Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, order: null, status: '' })}
      >
        <DialogTitle>Atualizar Status do Pedido</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusDialog.status}
              label="Status"
              onChange={(e) => setStatusDialog({ ...statusDialog, status: e.target.value })}
            >
              <MenuItem value="active">Ativo</MenuItem>
              <MenuItem value="completed">Completo</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog({ open: false, order: null, status: '' })}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateStatus}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Atualizar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default OrderManagement;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import AppLayout from '../../components/layout/AppLayout';

const PaymentRequests = () => {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { socket } = useSocket();
  
  // Estado para diálogo de processamento de pagamento
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    tableId: null,
    tableNumber: null,
    amount: 0,
    orders: [],
    showDetails: false
  });
  
  // Estado para método de pagamento
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Estado para diálogo de confirmação de exclusão
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    paymentId: null,
    tableNumber: null
  });
  
  // Carregar histórico completo de pagamentos
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        setLoading(true);
        
        // Buscar histórico completo de pagamentos (pendentes e pagos)
        const response = await axios.get('/api/orders/payment/history');
        
        // Mapear cada pedido como um pagamento individual
        const formattedPayments = response.data
          .filter(order => order && order._id) // Filtra pedidos nulos ou inválidos
          .map(order => ({
            id: order._id,
            tableId: order.table?._id || 'mesa-removida',
            tableNumber: order.table?.number || 'N/A',
            totalAmount: order.totalAmount || 0,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            paymentStatus: order.paymentStatus || 'pending',
            paymentMethod: order.paymentMethod || null,
            waiterId: order.waiter?._id,
            waiterName: order.waiter?.name || 'Garçom não atribuído',
            items: order.items || [],
            // Adicionamos o pedido original para manter a compatibilidade
            originalOrder: order
          }));
        
        // Ordenar pela data mais recente
        const sortedPayments = formattedPayments.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        
        setPaymentHistory(sortedPayments);
        setError(null);
      } catch (err) {
        console.error('Error fetching payment history:', err);
        setError('Erro ao carregar histórico de pagamentos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentHistory();
    
    // Configurar atualização periódica
    const interval = setInterval(fetchPaymentHistory, 30000);
    
    // Limpar quando o componente for desmontado
    return () => clearInterval(interval);
  }, []);
  
  // Ouvir notificações de pagamento pelo socket
  useEffect(() => {
    if (socket) {
      const handlePaymentRequest = () => {
        // Atualizar a lista quando receber nova solicitação de pagamento
        fetchPaymentHistory();
      };
      
      socket.on('paymentRequestNotification', handlePaymentRequest);
      
      return () => {
        socket.off('paymentRequestNotification', handlePaymentRequest);
      };
    }
  }, [socket]);
  
  // Função auxiliar para buscar histórico de pagamentos
  const fetchPaymentHistory = async () => {
    try {
      // Buscar histórico completo de pagamentos (pendentes e pagos)
      const response = await axios.get('/api/orders/payment/history');
      
      // Mapear cada pedido como um pagamento individual
      const formattedPayments = response.data
        .filter(order => order && order._id) // Filtra pedidos nulos ou inválidos
        .map(order => ({
          id: order._id,
          tableId: order.table?._id || 'mesa-removida',
          tableNumber: order.table?.number || 'N/A',
          totalAmount: order.totalAmount || 0,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          paymentStatus: order.paymentStatus || 'pending',
          paymentMethod: order.paymentMethod || null,
          waiterId: order.waiter?._id,
          waiterName: order.waiter?.name || 'Garçom não atribuído',
          items: order.items || [],
          // Adicionamos o pedido original para manter a compatibilidade
          originalOrder: order
        }));
      
      // Ordenar pela data mais recente
      const sortedPayments = formattedPayments.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      
      setPaymentHistory(sortedPayments);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Erro ao atualizar histórico de pagamentos. Tente novamente.');
    }
  };
  
  // Abrir diálogo para processar pagamento
  const handleOpenPaymentDialog = (payment) => {
    setPaymentDialog({
      open: true,
      tableId: payment.tableId,
      tableNumber: payment.tableNumber,
      orderId: payment.id,
      amount: payment.totalAmount,
      showDetails: false
    });
  };
  
  // Processar pagamento
  const handleProcessPayment = async () => {
    try {
      setLoading(true);
      
      // Atualizar status de pagamento do pedido individual
      await axios.put(`/api/orders/${paymentDialog.orderId}`, {
        paymentStatus: 'paid',
        paymentMethod: paymentMethod
      });
      
      // Verificar se existem outros pedidos pendentes na mesa
      const pendingOrders = paymentHistory.filter(
        p => p.tableId === paymentDialog.tableId && 
             p.paymentStatus === 'pending' &&
             p.id !== paymentDialog.orderId
      );
      
      // Se não houver outros pedidos pendentes, atualizar status da mesa para disponível
      if (pendingOrders.length === 0) {
        await axios.put(`/api/tables/${paymentDialog.tableId}/status`, {
          status: 'available'
        });
      }
      
      setSuccess(`Pagamento do pedido processado com sucesso.`);
      setPaymentDialog({ ...paymentDialog, open: false });
      
      // Atualizar histórico de pagamentos
      fetchPaymentHistory();
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir diálogo de confirmação para excluir pagamento
  const handleOpenDeleteDialog = (payment) => {
    setDeleteDialog({
      open: true,
      paymentId: payment.id,
      tableNumber: payment.tableNumber
    });
  };
  
  // Excluir pagamento
  const handleDeletePayment = async () => {
    try {
      setLoading(true);
      
      // Excluir o pedido usando a rota específica para pagamentos
      await axios.delete(`/api/orders/${deleteDialog.paymentId}/payment`);
      
      setSuccess(`Pagamento excluído com sucesso.`);
      setDeleteDialog({ ...deleteDialog, open: false });
      
      // Atualizar histórico de pagamentos
      fetchPaymentHistory();
    } catch (err) {
      console.error('Error deleting payment:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Erro ao excluir pagamento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Formatar data para exibição
  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };
  
  // Formatar valor monetário
  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };
  
  // Exibir informações detalhadas do pedido
  const renderOrderDetails = (order) => {
    return (
      <TableRow key={order._id}>
        <TableCell>{order._id.substring(order._id.length - 6)}</TableCell>
        <TableCell>{formatDate(order.createdAt)}</TableCell>
        <TableCell>{order.items?.length || 0}</TableCell>
        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
        <TableCell>{order.waiter?.name || 'Não atribuído'}</TableCell>
      </TableRow>
    );
  };
  
  // Renderizar itens de um pedido
  const renderOrderItems = (items) => {
    return items.map((item, index) => (
      <TableRow key={index}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.quantity}</TableCell>
        <TableCell>{formatCurrency(item.price)}</TableCell>
        <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
      </TableRow>
    ));
  };
  
  if (loading && paymentHistory.length === 0) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  // Filtrar pagamentos pendentes e pagos
  const pendingPayments = paymentHistory.filter(payment => payment.paymentStatus === 'pending');
  const paidPayments = paymentHistory.filter(payment => payment.paymentStatus === 'paid');

  return (
    <AppLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PaymentIcon sx={{ fontSize: 28, mr: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="h1">
              Histórico de Pagamentos
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}
          
          {paymentHistory.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Não há registros de pagamentos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                O histórico aparecerá aqui quando um garçom solicitar pagamento para uma mesa
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Seção de Pagamentos Pendentes */}
              {pendingPayments.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <PaymentIcon sx={{ mr: 1, color: 'warning.main' }} />
                    Pagamentos Pendentes
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {pendingPayments.map((payment) => (
                      <Grid item xs={12} md={6} lg={4} key={payment.id}>
                        <Paper 
                          elevation={3} 
                          sx={{ 
                            borderRadius: 2,
                            overflow: 'hidden',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-4px)' }
                          }}
                        >
                          <Box sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            p: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TableRestaurantIcon sx={{ mr: 1 }} />
                              <Typography variant="h6" component="h2">
                                Mesa {payment.tableNumber}
                              </Typography>
                            </Box>
                            <Chip 
                              label="Pagamento Pendente" 
                              color="warning" 
                              size="small" 
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>
                          
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Solicitado em
                                </Typography>
                                <Typography variant="body1">
                                  {formatDate(payment.updatedAt)}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Pedido ID
                                </Typography>
                                <Typography variant="body1">
                                  {payment.id.substring(payment.id.length - 6)}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Garçom
                              </Typography>
                              <Typography variant="body1">
                                {payment.waiterName || 'Não atribuído'}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="body2" color="text.secondary">
                                Valor Total
                              </Typography>
                              <Typography variant="h5" fontWeight="bold" color="primary.main">
                                {formatCurrency(payment.totalAmount)}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Itens: {payment.items?.length || 0}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                sx={{ mr: 1 }}
                                onClick={() => handleOpenDeleteDialog(payment)}
                              >
                                Excluir
                              </Button>
                              
                              <Button
                                variant="outlined"
                                sx={{ mr: 1 }}
                                onClick={() => setPaymentDialog({
                                  ...paymentDialog,
                                  open: true,
                                  tableId: payment.tableId,
                                  tableNumber: payment.tableNumber,
                                  showDetails: true,
                                  orders: [payment.originalOrder],
                                  amount: payment.totalAmount
                                })}
                              >
                                Ver Detalhes
                              </Button>
                              
                              <Button
                                variant="contained"
                                startIcon={<PaymentIcon />}
                                onClick={() => handleOpenPaymentDialog(payment)}
                              >
                                Processar Pagamento
                              </Button>
                            </Box>
                          </CardContent>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {/* Seção de Pagamentos Realizados */}
              {paidPayments.length > 0 && (
                <Box sx={{ mt: 5 }}>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <HistoryIcon sx={{ mr: 1, color: 'success.main' }} />
                    Histórico de Pagamentos Realizados
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {paidPayments.map((payment) => (
                      <Grid item xs={12} md={6} lg={4} key={payment.id}>
                        <Paper 
                          elevation={2}
                          sx={{ 
                            borderRadius: 2,
                            overflow: 'hidden',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-4px)' }
                          }}
                        >
                          <Box sx={{ 
                            bgcolor: 'success.main', 
                            color: 'white',
                            p: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TableRestaurantIcon sx={{ mr: 1 }} />
                              <Typography variant="h6" component="h2">
                                Mesa {payment.tableNumber}
                              </Typography>
                            </Box>
                            <Chip 
                              label="Pago" 
                              color="default"
                              size="small" 
                              icon={<CheckCircleIcon />}
                              sx={{ 
                                fontWeight: 'bold',
                                bgcolor: 'white',
                                color: 'success.dark'
                              }}
                            />
                          </Box>
                          
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Pago em
                                </Typography>
                                <Typography variant="body1">
                                  {formatDate(payment.updatedAt)}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Pedido ID
                                </Typography>
                                <Typography variant="body1">
                                  {payment.id.substring(payment.id.length - 6)}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Garçom
                                </Typography>
                                <Typography variant="body1">
                                  {payment.waiterName || 'Não atribuído'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Método
                                </Typography>
                                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                  {payment.paymentMethod || 'Não especificado'}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="body2" color="text.secondary">
                                Valor Total
                              </Typography>
                              <Typography variant="h5" fontWeight="bold" color="success.main">
                                {formatCurrency(payment.totalAmount)}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Itens: {payment.items?.length || 0}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                sx={{ mr: 1 }}
                                onClick={() => handleOpenDeleteDialog(payment)}
                              >
                                Excluir
                              </Button>
                              
                              <Button
                                variant="outlined"
                                color="success"
                                onClick={() => setPaymentDialog({
                                  ...paymentDialog,
                                  open: true,
                                  tableId: payment.tableId,
                                  tableNumber: payment.tableNumber,
                                  showDetails: true,
                                  orders: [payment.originalOrder],
                                  amount: payment.totalAmount
                                })}
                              >
                                Ver Detalhes
                              </Button>
                            </Box>
                          </CardContent>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
      
      <Dialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ ...paymentDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {paymentDialog.showDetails 
            ? `Detalhes da Mesa ${paymentDialog.tableNumber}` 
            : `Processar Pagamento - Mesa ${paymentDialog.tableNumber}`}
        </DialogTitle>
        
        <DialogContent dividers>
          {paymentDialog.showDetails ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Detalhes do Pedido
              </Typography>
              
              <TableContainer sx={{ mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell>Itens</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Garçom</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentDialog.orders.map(renderOrderDetails)}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {paymentDialog.orders[0]?.items?.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Itens do Pedido
                  </Typography>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Quantidade</TableCell>
                          <TableCell>Preço Unit.</TableCell>
                          <TableCell>Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {renderOrderItems(paymentDialog.orders[0].items)}
                        <TableRow>
                          <TableCell colSpan={2} />
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            Total:
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {formatCurrency(paymentDialog.amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Total a pagar: {formatCurrency(paymentDialog.amount)}
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="payment-method-label">Método de Pagamento</InputLabel>
                <Select
                  labelId="payment-method-label"
                  value={paymentMethod}
                  label="Método de Pagamento"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <MenuItem value="cash">Dinheiro</MenuItem>
                  <MenuItem value="credit">Cartão de Crédito</MenuItem>
                  <MenuItem value="debit">Cartão de Débito</MenuItem>
                  <MenuItem value="pix">PIX</MenuItem>
                  <MenuItem value="app">Aplicativo</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setPaymentDialog({ ...paymentDialog, open: false })}
            color="inherit"
          >
            {paymentDialog.showDetails ? 'Fechar' : 'Cancelar'}
          </Button>
          
          {!paymentDialog.showDetails && (
            <Button 
              onClick={handleProcessPayment} 
              variant="contained"
              startIcon={<CheckCircleIcon />}
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Você tem certeza que deseja excluir este pagamento da mesa {deleteDialog.tableNumber}?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeletePayment} 
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={loading}
          >
            {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default PaymentRequests;

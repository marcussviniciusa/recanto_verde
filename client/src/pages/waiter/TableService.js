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
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';

// Ícones
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SplitscreenIcon from '@mui/icons-material/Splitscreen';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';

// Router e HTTP
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Utilitários
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Contextos
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

// Componentes
import AppLayout from '../../components/layout/AppLayout';

// Componentes de divisão de conta
import SplitBillManager from '../../components/payments/SplitBillManager';
import SplitPaymentDialog from '../../components/payments/SplitPaymentDialog';

const TableService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emitTableUpdate, socket, emitRequestPayment } = useSocket();
  
  const [table, setTable] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Estados para gerenciar múltiplos garçons
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiters, setSelectedWaiters] = useState([]);
  const [openWaiterDialog, setOpenWaiterDialog] = useState(false);
  
  // Estados para juntar mesas
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  
  // Estados para divisão de contas
  const [splitBillEnabled, setSplitBillEnabled] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [openSplitDialog, setOpenSplitDialog] = useState(false);
  const [splitMethod, setSplitMethod] = useState('equal'); // 'equal', 'custom', 'byItem'
  const [activeItems, setActiveItems] = useState([]);
  const [splitPaymentDialog, setSplitPaymentDialog] = useState(false);
  const [selectedDivisionForPayment, setSelectedDivisionForPayment] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  
  // Estados de confirmação
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // Estados para abrir mesa
  const [openTableDialog, setOpenTableDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [customerCount, setCustomerCount] = useState(1);

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para calcular o total da conta
  const calculateTotal = () => {
    return orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  };

  // Função para calcular os valores de cada divisão
  const calculateDivisionAmounts = () => {
    const result = [...divisions];
    const totalBill = calculateTotal();
    
    if (splitMethod === 'equal') {
      // Divisão igual entre todos
      const equalAmount = totalBill / divisions.length;
      return result.map(division => ({
        ...division,
        percentage: 100 / divisions.length,
        totalAmount: parseFloat(equalAmount.toFixed(2))
      }));
    } 
    else if (splitMethod === 'custom') {
      // Divisão percentual personalizada
      return result.map(division => ({
        ...division,
        totalAmount: parseFloat((totalBill * (division.percentage / 100)).toFixed(2))
      }));
    }
    
    return result;
  };

  // Função para buscar dados da mesa
  const fetchTable = async () => {
    try {
      const response = await axios.get(`/api/tables/${id}`);
      setTable(response.data);
      
      // Definir estados de divisão de conta, se existirem
      if (response.data.splitBills) {
        setSplitBillEnabled(response.data.splitBills.enabled);
        setSplitMethod(response.data.splitBills.method || 'equal');
        setDivisions(response.data.splitBills.divisions || []);
      }
    } catch (err) {
      console.error('Error fetching table:', err);
      setError('Erro ao buscar informações da mesa. Tente novamente.');
    }
  };

  // Buscar pedidos
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`/api/orders/table/${id}`);
      // Filtrar apenas pedidos ativos ou completados não pagos
      const filteredOrders = response.data.filter(order => 
        order.status === 'active' || 
        (order.status === 'completed' && (!order.paymentStatus || order.paymentStatus !== 'paid'))
      );
      setOrders(filteredOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Erro ao buscar pedidos. Tente novamente.');
    }
  };

  // Função para buscar todos os dados
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchTable();
      await fetchOrders();
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao buscar dados. Tente novamente.');
      setLoading(false);
    }
  };

  // Função para adicionar nova divisão
  const handleAddDivision = () => {
    const newDivision = {
      id: Date.now().toString(),
      name: `Cliente ${divisions.length + 1}`,
      percentage: 0,
      totalAmount: 0
    };
    
    const updatedDivisions = [...divisions, newDivision];
    setDivisions(updatedDivisions);
    
    // Recalcular percentuais baseados no número de divisões
    if (splitMethod === 'equal') {
      const equalPercentage = 100 / updatedDivisions.length;
      const calculatedDivisions = updatedDivisions.map(div => ({
        ...div,
        percentage: equalPercentage
      }));
      setDivisions(calculatedDivisions);
    }
  };

  // Função para remover uma divisão
  const handleRemoveDivision = (divisionId) => {
    const updatedDivisions = divisions.filter(div => div.id !== divisionId);
    setDivisions(updatedDivisions);
    
    // Recalcular percentuais se necessário
    if (splitMethod === 'equal' && updatedDivisions.length > 0) {
      const equalPercentage = 100 / updatedDivisions.length;
      const calculatedDivisions = updatedDivisions.map(div => ({
        ...div,
        percentage: equalPercentage
      }));
      setDivisions(calculatedDivisions);
    }
  };

  // Função para atualizar uma divisão
  const handleUpdateDivision = (divisionId, updates) => {
    const updatedDivisions = divisions.map(div => 
      div.id === divisionId ? { ...div, ...updates } : div
    );
    setDivisions(updatedDivisions);
  };

  // Gerenciar divisão de contas
  const handleSplitBill = async () => {
    try {
      setLoading(true);
      
      // Calcular valores antes de salvar
      const calculatedDivisions = calculateDivisionAmounts();
      
      await axios.post(`/api/tables/${id}/split`, {
        enabled: splitBillEnabled,
        method: splitMethod,
        divisions: calculatedDivisions
      });
      
      // Buscar mesa atualizada
      await fetchTable();
      setSuccess('Divisão de conta atualizada com sucesso!');
      
      // Emitir atualização para outros usuários
      emitTableUpdate(id);
      
      setLoading(false);
      setOpenSplitDialog(false);
    } catch (err) {
      console.error('Error splitting bill:', err);
      setError(err.response?.data?.message || 'Erro ao dividir conta.');
      setLoading(false);
    }
  };
  
  // Função para solicitar pagamento
  const handleRequestPayment = async () => {
    try {
      setError(null);
      if (splitBillEnabled && divisions.length > 0) {
        // Mostrar diálogo para selecionar divisão de pagamento
        setSplitPaymentDialog(true);
        return;
      }
      
      // Se não há divisão de conta, solicitar pagamento integral
      setLoadingPayment(true);
      
      await axios.post(`/api/tables/${id}/request-payment`, {
        tableId: id,
        amount: calculateTotal(),
        divisionId: null
      });
      
      // Notificar outros usuários
      emitRequestPayment(id, calculateTotal());
      setSuccess('Solicitação de pagamento enviada com sucesso!');
      setLoadingPayment(false);
    } catch (err) {
      console.error('Error requesting payment:', err);
      setError(err.response?.data?.message || 'Erro ao solicitar pagamento.');
      setLoadingPayment(false);
    }
  };
  
  // Função para processar pagamento de uma divisão
  const handleDivisionPayment = async (divisionId) => {
    try {
      setLoadingPayment(true);
      setError(null);
      
      const division = divisions.find(div => div.id === divisionId);
      if (!division) {
        throw new Error('Divisão não encontrada.');
      }
      
      await axios.post(`/api/tables/${id}/request-payment`, {
        tableId: id,
        amount: division.totalAmount,
        divisionId: division.id
      });
      
      // Notificar outros usuários
      emitRequestPayment(id, division.totalAmount, division.id);
      setSuccess(`Solicitação de pagamento para ${division.name} enviada com sucesso!`);
      
      setLoadingPayment(false);
      setSplitPaymentDialog(false);
    } catch (err) {
      console.error('Error requesting division payment:', err);
      setError(err.response?.data?.message || 'Erro ao solicitar pagamento para divisão.');
      setLoadingPayment(false);
    }
  };
  
  // Função para fechar a mesa
  const handleCloseTable = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.post(`/api/tables/${id}/close`);
      
      // Notificar outros usuários
      emitTableUpdate(id);
      setSuccess('Mesa fechada com sucesso!');
      
      // Redirecionar para a lista de mesas
      navigate('/waiter/tables');
    } catch (err) {
      console.error('Error closing table:', err);
      setError(err.response?.data?.message || 'Erro ao fechar mesa.');
      setLoading(false);
    }
  };

  // Função para juntar mesas
  const handleJoinTables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Implementação pendente
      
      setLoading(false);
    } catch (err) {
      console.error('Error joining tables:', err);
      setError('Erro ao juntar mesas. Tente novamente.');
      setLoading(false);
    }
  };

  // Função para gerenciar garçons
  const handleUpdateWaiters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.post(`/api/tables/${id}/waiters`, {
        waiters: selectedWaiters
      });
      
      // Buscar mesa atualizada
      await fetchTable();
      
      // Notificar outros usuários
      emitTableUpdate(id);
      
      setSuccess('Garçons atualizados com sucesso!');
      setOpenWaiterDialog(false);
      setLoading(false);
    } catch (err) {
      console.error('Error updating waiters:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar garçons.');
      setLoading(false);
    }
  };

  // Efeito para buscar dados iniciais
  useEffect(() => {
    // Configurar axios
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';
    
    // Buscar dados
    fetchData();
    
    // Função para atualizar dimensões da janela
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  // Efeito para atualizar valores quando o método de divisão muda
  useEffect(() => {
    if (divisions.length > 0) {
      // Recalcular valores baseados no método atual
      const calculatedDivisions = calculateDivisionAmounts();
      setDivisions(calculatedDivisions);
    }
  }, [splitMethod]);

  // Efeito para escutar atualizações de socket
  useEffect(() => {
    if (socket) {
      const handleTableUpdate = (updatedTableId) => {
        if (updatedTableId === id) {
          fetchData();
        }
      };
      
      socket.on('table_updated', handleTableUpdate);
      
      return () => {
        socket.off('table_updated', handleTableUpdate);
      };
    }
  }, [socket, id]);

  // Função para renderizar informações da mesa
  const renderTableInfo = () => {
    if (!table) return null;
    
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" gutterBottom>
                Mesa #{table.number}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
                {table.customerCount} {table.customerCount === 1 ? 'cliente' : 'clientes'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
                Aberta há {format(new Date(table.openedAt), "HH:mm 'em' dd/MM/yyyy", { locale: ptBR })}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
              <Chip 
                label={table.status === 'open' ? 'Aberta' : 'Fechada'} 
                color={table.status === 'open' ? 'success' : 'error'}
                sx={{ mb: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Função para renderizar pedidos ativos
  const renderOrders = () => {
    if (!orders || orders.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Não há pedidos ativos para esta mesa.
        </Alert>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Pedidos Ativos
        </Typography>
        <List>
          {orders.map(order => (
            <Paper key={order._id} sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Pedido #{order.orderNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Realizado em: {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Typography>
              <List dense>
                {order.items.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <RestaurantMenuIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.name} 
                      secondary={`${item.quantity}x ${formatCurrency(item.price)}`} 
                    />
                    <ListItemSecondaryAction>
                      {formatCurrency(item.quantity * item.price)}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="body1">
                  Status: <Chip size="small" label={order.status === 'active' ? 'Em Preparo' : 'Pronto'} color={order.status === 'active' ? 'warning' : 'success'} />
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Total: {formatCurrency(order.totalAmount)}
                </Typography>
              </Box>
            </Paper>
          ))}
        </List>
      </Box>
    );
  };

  // Função para renderizar ações disponíveis
  const renderActions = () => {
    if (!table) return null;

    return (
      <Box sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => navigate(`/waiter/tables/${id}/order/new`)}
              disabled={loading || table.status !== 'open'}
            >
              Novo Pedido
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={<PaymentIcon />}
              onClick={handleRequestPayment}
              disabled={loading || orders.length === 0 || table.status !== 'open' || loadingPayment}
            >
              {loadingPayment ? <CircularProgress size={24} /> : 'Pagamento Completo'}
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              color="info"
              fullWidth
              startIcon={<SplitscreenIcon />}
              onClick={() => setOpenSplitDialog(true)}
              disabled={loading || table.status !== 'open'}
            >
              Dividir Conta
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Função para renderizar resumo financeiro
  const renderSummary = () => {
    if (!orders || orders.length === 0) return null;
    
    const totalAmount = calculateTotal();
    
    return (
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Resumo Financeiro
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h5" color="primary" align="right">
            Total: {formatCurrency(totalAmount)}
          </Typography>
          
          {splitBillEnabled && divisions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Divisão de Conta Ativa
              </Typography>
              <List dense>
                {divisions.map((division) => (
                  <ListItem key={division.id}>
                    <ListItemText
                      primary={division.name}
                      secondary={`${division.percentage.toFixed(2)}% do total`}
                    />
                    <ListItemSecondaryAction>
                      {formatCurrency(division.totalAmount)}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      </Box>
    );
  };
  
  // Renderizar diálogo de divisão de conta
  const renderSplitBillDialog = () => {
    return (
      <Dialog
        open={openSplitDialog}
        onClose={() => !loading && setOpenSplitDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Dividir Conta</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={splitBillEnabled}
                  onChange={(e) => setSplitBillEnabled(e.target.checked)}
                  color="primary"
                  disabled={loading}
                />
              }
              label="Ativar divisão de conta"
            />
          </Box>
          
          {splitBillEnabled && (
            <SplitBillManager
              divisions={divisions}
              splitMethod={splitMethod}
              onAddDivision={handleAddDivision}
              onRemoveDivision={handleRemoveDivision}
              onUpdateDivision={handleUpdateDivision}
              onChangeSplitMethod={(method) => setSplitMethod(method)}
              totalAmount={calculateTotal()}
              loading={loading}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSplitDialog(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSplitBill} 
            variant="contained" 
            color="primary"
            disabled={loading || (splitBillEnabled && divisions.length === 0)}
          >
            {loading ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  // Renderizar diálogo de pagamento dividido
  const renderSplitPaymentDialog = () => {
    return (
      <SplitPaymentDialog
        open={splitPaymentDialog}
        onClose={() => !loadingPayment && setSplitPaymentDialog(false)}
        divisions={divisions}
        onRequestFullPayment={() => {
          setSplitPaymentDialog(false);
          // Usar a função de pagamento completo
          handleRequestPayment();
        }}
        onRequestDivisionPayment={handleDivisionPayment}
        loading={loadingPayment}
      />
    );
  };
  
  // Renderizar o conteúdo principal
  return (
    <AppLayout title={`Mesa ${table ? '#' + table.number : ''}`}>
      {loading && !table ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <Box>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}
          
          {renderTableInfo()}
          {renderActions()}
          {renderSummary()}
          {renderOrders()}
        </Box>
      )}
      
      {/* Diálogos */}
      {renderSplitBillDialog()}
      {renderSplitPaymentDialog()}
      
      {/* Diálogo de confirmação genérico */}
      <Dialog
        open={confirmationDialog.open}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmationDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmationDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              if (confirmationDialog.onConfirm) confirmationDialog.onConfirm();
              setConfirmationDialog(prev => ({ ...prev, open: false }));
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default TableService;

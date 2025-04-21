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
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SplitscreenIcon from '@mui/icons-material/Splitscreen';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const { emitTableUpdate, socket, emitRequestPayment } = useSocket();
  
  const [table, setTable] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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
  
  // Estados de confirmação
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // Estados para abrir mesa
  const [openTableDialog, setOpenTableDialog] = useState(false);
  const [customerCount, setCustomerCount] = useState(1);
  
  // Função para buscar dados da mesa
  const fetchTable = async () => {
    try {
      const tableResponse = await axios.get(`/api/tables/${id}`);
      setTable(tableResponse.data);
      return tableResponse.data;
    } catch (err) {
      console.error('Error fetching table:', err);
      setError('Erro ao carregar dados da mesa.');
      throw err;
    }
  };
  
  // Fetch table and orders data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch table data
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
  
  // Buscar lista de garçons disponíveis
  useEffect(() => {
    const fetchWaiters = async () => {
      try {
        const response = await axios.get('/api/users/role/waiters');
        setWaiters(response.data);
      } catch (err) {
        console.error('Error fetching waiters:', err);
        // Definir pelo menos o usuário atual como garçom disponível
        // para permitir que a funcionalidade continue funcionando
        if (user) {
          setWaiters([user]);
        }
      }
    };
    
    fetchWaiters();
  }, [user]);
  
  // Buscar mesas disponíveis para juntar
  useEffect(() => {
    const fetchAvailableTables = async () => {
      if (!table) return;
      
      try {
        const response = await axios.get('/api/tables');
        // Filtrar apenas mesas disponíveis na mesma seção
        const availableTables = response.data.filter(t => 
          t.status === 'available' && 
          t.section === table.section && 
          t._id !== table._id
        );
        setAvailableTables(availableTables);
      } catch (err) {
        console.error('Error fetching available tables:', err);
      }
    };
    
    fetchAvailableTables();
  }, [table]);
  
  // Atualizar estado da divisão de contas quando a mesa mudar
  useEffect(() => {
    if (table && table.splitBills) {
      setSplitBillEnabled(table.splitBills.enabled);
      setDivisions(table.splitBills.divisions || []);
    }
  }, [table]);
  
  // Função para enviar evento de atualização de mesa via socket
  useEffect(() => {
    // Registrar no socket quando o componente montar
    if (socket) {
      socket.emit('join', 'waiter');
    }
    
    return () => {
      // Limpeza quando o componente desmontar
      if (socket) {
        socket.off('tableStatusChanged');
      }
    };
  }, [socket]);
  
  // Juntar mesas
  const handleJoinTables = async () => {
    if (selectedTables.length === 0) return;
    
    try {
      setLoading(true);
      
      // Garantir que os IDs sejam strings para evitar problemas de comparação
      const mainTableId = table._id.toString();
      const selectedTableIds = selectedTables.map(id => id.toString());
      
      // Obter os números das mesas selecionadas para exibir na mensagem de sucesso
      const selectedTablesInfo = availableTables
        .filter(t => selectedTableIds.includes(t._id.toString()))
        .map(t => t.tableNumber);
      
      // Log para depuração
      console.log('Tentando juntar mesas:', { mainTableId, selectedTableIds });
      
      await axios.post('/api/tables/join', { 
        tableIds: [mainTableId, ...selectedTableIds]
      });
      
      // Buscar mesa atualizada
      await fetchTable();
      
      // Fechar diálogo e limpar seleção
      setOpenJoinDialog(false);
      setSelectedTables([]);
      
      // Notificar outros usuários
      emitTableUpdate();
      
      // Mostrar mensagem de sucesso
      setSuccess(`Mesas unidas com sucesso! Mesa ${table.tableNumber} foi unida com as mesas ${selectedTablesInfo.join(', ')}.`);
    } catch (err) {
      console.error('Error joining tables:', err);
      let errorMessage = 'Erro ao juntar mesas.';
      
      // Obter mensagem detalhada do erro se disponível
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Separar mesas
  const handleUnjoinTables = async () => {
    if (!table || !table.isJoined) return;
    
    try {
      setLoading(true);
      
      await axios.post(`/api/tables/unjoin/${table._id}`);
      
      // Buscar mesa atualizada
      await fetchTable();
      
      // Notificar outros usuários
      emitTableUpdate();
    } catch (err) {
      console.error('Error unjoining tables:', err);
      setError(err.response?.data?.message || 'Erro ao separar mesas.');
    } finally {
      setLoading(false);
    }
  };
  
  // Adicionar/remover garçons da mesa
  const handleUpdateWaiters = async () => {
    try {
      setLoading(true);
      
      // Garantir que o garçom atual esteja incluído
      if (!selectedWaiters.includes(user._id)) {
        selectedWaiters.push(user._id);
      }
      
      await axios.post(`/api/tables/${id}/waiters`, {
        waiters: selectedWaiters,
        action: 'add'
      });
      
      // Buscar mesa atualizada
      await fetchTable();
      
      // Fechar diálogo
      setOpenWaiterDialog(false);
      
      // Notificar outros usuários
      emitTableUpdate();
    } catch (err) {
      console.error('Error updating waiters:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar garçons.');
    } finally {
      setLoading(false);
    }
  };
  
  // Gerenciar divisão de contas
  const handleSplitBill = async () => {
    try {
      setLoading(true);
      
      await axios.post(`/api/tables/${id}/split`, {
        enabled: splitBillEnabled,
        divisions
      });
      
      // Buscar mesa atualizada
      await fetchTable();
      
      // Fechar diálogo
      setOpenSplitDialog(false);
      
      // Notificar outros usuários
      emitTableUpdate();
    } catch (err) {
      console.error('Error updating split bill:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar divisão de contas.');
    } finally {
      setLoading(false);
    }
  };
  
  // Adicionar nova divisão de conta
  const handleAddDivision = () => {
    const newDivision = {
      name: `Cliente ${divisions.length + 1}`,
      waiter: user._id,
      items: []
    };
    
    setDivisions([...divisions, newDivision]);
  };
  
  // Remover divisão de conta
  const handleRemoveDivision = (index) => {
    const newDivisions = [...divisions];
    newDivisions.splice(index, 1);
    setDivisions(newDivisions);
  };
  
  // Alternar seleção de mesa para juntar
  const handleToggleTableSelection = (tableId) => {
    // Certifique-se de que estamos operando com strings para evitar erros de comparação
    const tableIdStr = tableId.toString();
    
    // Verificar se a mesa já está selecionada
    if (selectedTables.some(id => id.toString() === tableIdStr)) {
      // Remove da seleção
      setSelectedTables(prev => prev.filter(id => id.toString() !== tableIdStr));
    } else {
      // Adiciona à seleção
      setSelectedTables(prev => [...prev, tableIdStr]);
    }
    
    // Log para depuração
    console.log('Toggle table selection:', {
      tableId: tableIdStr,
      currentSelected: selectedTables,
      willBe: selectedTables.some(id => id.toString() === tableIdStr) 
        ? selectedTables.filter(id => id.toString() !== tableIdStr)
        : [...selectedTables, tableIdStr]
    });
  };
  
  // Handle table status update
  const updateTableStatus = async (status) => {
    try {
      setError(null);
      
      // Log para depuração
      console.log(`Atualizando status da mesa ${id} para ${status}`);
      
      // Usar o endpoint específico para status, que propaga para mesas relacionadas
      const response = await axios.put(`/api/tables/${id}/status`, {
        status,
        assignedWaiter: user._id
      });
      
      // Atualizar a mesa local
      setTable(response.data);
      
      // Verificar se a mesa tem mesas relacionadas
      const hasRelatedTables = 
        (response.data.isJoined && response.data.joinedWith && response.data.joinedWith.length > 0) ||
        (response.data.isVirtual && response.data.parentTable);
      
      if (hasRelatedTables) {
        console.log(`Mesa relacionada detectada - propagando status para todas as mesas conectadas`);
        
        // Para mesas unidas, emitimos evento para cada mesa relacionada
        if (response.data.isJoined && response.data.joinedWith && response.data.joinedWith.length > 0) {
          // Emitir para a mesa principal primeiro
          emitTableUpdate({
            tableId: response.data._id,
            tableNumber: response.data.tableNumber,
            status: response.data.status
          });
          
          // Emitir para cada mesa relacionada
          response.data.joinedWith.forEach(relatedTableId => {
            // O socket pode precisar do ID como string
            const tableId = typeof relatedTableId === 'object' 
              ? relatedTableId._id.toString() 
              : relatedTableId.toString();
              
            console.log(`Emitindo atualização para mesa relacionada: ${tableId}`);
            
            // Emitir evento para cada mesa relacionada
            emitTableUpdate({
              tableId,
              status: response.data.status,
              // Usar tableNumber da resposta como fallback 
              tableNumber: response.data.tableNumber
            });
            
            // Usar o socket diretamente para ter certeza
            if (socket) {
              socket.emit('tableStatusChange', {
                tableId,
                status: response.data.status
              });
            }
          });
        }
        // Para mesas virtuais, emitimos evento para a mesa principal
        else if (response.data.isVirtual && response.data.parentTable) {
          const parentId = typeof response.data.parentTable === 'object'
            ? response.data.parentTable._id.toString()
            : response.data.parentTable.toString();
            
          console.log(`Emitindo atualização para mesa principal: ${parentId}`);
          
          // Emitir evento para a mesa principal
          emitTableUpdate({
            tableId: parentId,
            status: response.data.status
          });
          
          // Usar o socket diretamente para ter certeza
          if (socket) {
            socket.emit('tableStatusChange', {
              tableId: parentId,
              status: response.data.status
            });
          }
        }
      } else {
        // Mesa normal, apenas emitir evento padrão
        emitTableUpdate({
          tableId: id,
          tableNumber: response.data.tableNumber,
          status: response.data.status
        });
      }
      
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
      await updateTableStatus('occupied');
      
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
      
      // Calcular o total da conta para incluir na notificação
      const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      for (const order of activeOrders) {
        await axios.put(`/api/orders/${order._id}`, {
          status: 'completed',
          paymentStatus: 'pending'
        });
      }
      
      // Refresh orders
      const ordersResponse = await axios.get(`/api/orders/table/${id}`);
      setOrders(ordersResponse.data);
      
      // Emitir notificação de pagamento para o administrador e outros garçons
      emitRequestPayment({
        tableId: id,
        tableNumber: table.tableNumber,
        totalAmount: totalAmount,
        requestedBy: user.name,
        timestamp: new Date().toISOString()
      });
      
      // Show confirmation
      setConfirmationDialog({
        open: true,
        title: 'Pagamento Solicitado',
        message: `Pagamento de R$ ${totalAmount.toFixed(2)} foi solicitado. A recepção e outros garçons serão notificados.`,
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
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
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
      
      {/* Ações adicionais específicas para mesas */}
      {table && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Ações da Mesa
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Botão para juntar mesas */}
            <Grid item>
              {table.isJoined ? (
                <Button
                  variant="outlined"
                  startIcon={<LinkOffIcon />}
                  onClick={handleUnjoinTables}
                  disabled={table.status !== 'available'}
                >
                  Separar Mesas
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={() => setOpenJoinDialog(true)}
                  disabled={table.status !== 'available' || availableTables.length === 0}
                >
                  Juntar Mesas
                </Button>
              )}
            </Grid>
            
            {/* Botão para gerenciar garçons */}
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => {
                  // Pré-selecionar garçons já associados
                  if (table.assignedWaiters) {
                    setSelectedWaiters(table.assignedWaiters.map(w => 
                      typeof w === 'object' ? w._id : w
                    ));
                  } else {
                    setSelectedWaiters([user._id]);
                  }
                  setOpenWaiterDialog(true);
                }}
              >
                Garçons ({table.assignedWaiters?.length || 1})
              </Button>
            </Grid>
            
            {/* Botão para gerenciar divisão de contas */}
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<SplitscreenIcon />}
                onClick={() => setOpenSplitDialog(true)}
                disabled={table.status !== 'occupied'}
              >
                {table.splitBills?.enabled ? 'Conta Dividida' : 'Dividir Conta'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
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
      
      {/* Diálogo para juntar mesas */}
      <Dialog
        open={openJoinDialog}
        onClose={() => setOpenJoinDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Juntar Mesas</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Selecione as mesas que deseja juntar com a Mesa {table?.tableNumber}:
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
            Você pode selecionar múltiplas mesas para juntar em uma única operação.
          </Typography>
          {availableTables.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Não há mesas disponíveis para juntar na mesma seção.
            </Alert>
          ) : (
            <List>
              {availableTables.map((t) => (
                <ListItem 
                  key={t._id}
                  button
                  onClick={() => handleToggleTableSelection(t._id)}
                  selected={selectedTables.some(id => id.toString() === t._id.toString())}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.main',
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    <Avatar 
                      sx={{ 
                        bgcolor: selectedTables.some(id => id.toString() === t._id.toString()) 
                          ? 'primary.main' 
                          : 'grey.400'
                      }}
                    >
                      {t.tableNumber}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Mesa ${t.tableNumber}`} 
                    secondary={`${t.capacity} lugares`} 
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            A capacidade total será a soma das capacidades de todas as mesas.
            As mesas unidas aparecerão como uma única mesa no sistema.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenJoinDialog(false)} 
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleJoinTables} 
            color="primary"
            variant="contained"
            disabled={selectedTables.length === 0 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
          >
            Juntar Mesas
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para gerenciar garçons */}
      <Dialog
        open={openWaiterDialog}
        onClose={() => setOpenWaiterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Gerenciar Garçons</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Selecione os garçons que atenderão esta mesa:
          </Typography>
          
          <List>
            {waiters.map((waiter) => (
              <ListItem 
                key={waiter._id}
                button
                onClick={() => {
                  // Não permitir desselecionar o usuário atual
                  if (waiter._id === user._id) return;
                  
                  // Alternar seleção para outros garçons
                  if (selectedWaiters.includes(waiter._id)) {
                    setSelectedWaiters(selectedWaiters.filter(id => id !== waiter._id));
                  } else {
                    setSelectedWaiters([...selectedWaiters, waiter._id]);
                  }
                }}
                selected={selectedWaiters.includes(waiter._id)}
                disabled={waiter._id === user._id} // Usuário atual sempre selecionado
              >
                <ListItemIcon>
                  <Avatar 
                    sx={{ 
                      bgcolor: selectedWaiters.includes(waiter._id) ? 'primary.main' : 'grey.400'
                    }}
                  >
                    {waiter.name.substring(0, 1).toUpperCase()}
                  </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary={waiter.name} 
                  secondary={waiter._id === user._id ? 'Você' : waiter.email} 
                />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Múltiplos garçons podem atender a mesma mesa para dividir a conta.
            Você sempre será incluído como um dos garçons.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenWaiterDialog(false)} 
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateWaiters} 
            color="primary"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
          >
            Atualizar Garçons
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para divisão de conta */}
      <Dialog
        open={openSplitDialog}
        onClose={() => setOpenSplitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Divisão de Conta</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={splitBillEnabled}
                onChange={(e) => setSplitBillEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Habilitar divisão de conta"
            sx={{ mb: 2 }}
          />
          
          {splitBillEnabled && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Divisões de Conta:
              </Typography>
              
              <List>
                {divisions.map((division, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {index + 1}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <TextField 
                          value={division.name}
                          onChange={(e) => {
                            const newDivisions = [...divisions];
                            newDivisions[index].name = e.target.value;
                            setDivisions(newDivisions);
                          }}
                          variant="outlined"
                          size="small"
                          fullWidth
                          label="Nome/Identificação"
                        />
                      }
                      secondary={
                        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                          <InputLabel>Garçom Responsável</InputLabel>
                          <Select
                            value={division.waiter || user._id}
                            onChange={(e) => {
                              const newDivisions = [...divisions];
                              newDivisions[index].waiter = e.target.value;
                              setDivisions(newDivisions);
                            }}
                            label="Garçom Responsável"
                          >
                            {waiters.map(waiter => (
                              <MenuItem key={waiter._id} value={waiter._id}>
                                {waiter.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleRemoveDivision(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddDivision}
                sx={{ mt: 2 }}
                fullWidth
              >
                Adicionar Divisão
              </Button>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Cada divisão pode ter um garçom responsável diferente.
                Ao fazer o pedido, você poderá atribuir itens a cada divisão.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenSplitDialog(false)} 
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSplitBill} 
            color="primary"
            variant="contained"
            disabled={loading || (splitBillEnabled && divisions.length === 0)}
            startIcon={loading ? <CircularProgress size={20} /> : <SplitscreenIcon />}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
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

import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  useTheme,
  Tooltip,
  Badge
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PersonIcon from '@mui/icons-material/Person';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LinkIcon from '@mui/icons-material/Link';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import AppLayout from '../../components/layout/AppLayout';
import { keyframes } from '@emotion/react';

const pulseBorder = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(63, 81, 181, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(63, 81, 181, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(63, 81, 181, 0);
  }
`;

const waveAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const pulseOccupiedAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 152, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
  }
`;

const glowAnimation = keyframes`
  0% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
  100% {
    filter: brightness(1);
  }
`;

const borderPulseAnimation = keyframes`
  0% {
    border-color: rgba(255, 152, 0, 0.6);
  }
  50% {
    border-color: rgba(255, 152, 0, 1);
  }
  100% {
    border-color: rgba(255, 152, 0, 0.6);
  }
`;

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { notifications, socket } = useSocket();
  const theme = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const tablesResponse = await axios.get('/api/tables');
        setTables(tablesResponse.data);
        
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
    
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notifications.some(n => !n.read && (n.type === 'table' || n.type === 'ready'))) {
      const fetchData = async () => {
        try {
          const tablesResponse = await axios.get('/api/tables');
          setTables(tablesResponse.data);
          
          const ordersResponse = await axios.get('/api/orders/status/active');
          setActiveOrders(ordersResponse.data);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };
      
      fetchData();
    }
  }, [notifications]);

  useEffect(() => {
    if (!socket) {
      console.log('Socket not available');
      return;
    }
    
    console.log('Setting up socket listener for table status changes');
    
    // Listener para atualização de status de mesa
    const handleTableStatusChange = (data) => {
      console.log('Table status changed via socket:', data);
      
      // Verificar se temos os dados necessários
      if (!data || !data.tableId) {
        console.warn('Received invalid table status update data', data);
        return;
      }
      
      // Extrair o ID da mesa e garantir que é uma string para comparação
      const tableId = typeof data.tableId === 'object' ? data.tableId._id : data.tableId.toString();
      
      // Atualizar a mesa local imediatamente sem fazer nova requisição
      setTables(prevTables => 
        prevTables.map(table => {
          // Garantir que estamos comparando strings
          const currentTableId = typeof table._id === 'object' ? table._id.toString() : table._id.toString();
          
          if (currentTableId === tableId) {
            console.log(`Updating table ${table.tableNumber} status to ${data.status}`);
            return { ...table, status: data.status };
          }
          return table;
        })
      );
    };
    
    // Registrar listeners para ambos os eventos que podem atualizar status de mesa
    socket.on('tableStatusChanged', handleTableStatusChange);
    socket.on('tableUpdated', handleTableStatusChange);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('tableStatusChanged', handleTableStatusChange);
      socket.off('tableUpdated', handleTableStatusChange);
    };
  }, [socket]);

  const handleTableClick = (tableId) => {
    navigate(`/table/${tableId}`);
  };
  
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
  
  // Grupo de mesas por seção - certifique-se de que as mesas virtuais também apareçam
  // Não filtramos por isVirtual para que todas as mesas apareçam
  const groupedTables = tables.reduce((acc, table) => {
    const section = table.section || 'main';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(table);
    return acc;
  }, {});
  
  Object.keys(groupedTables).forEach(section => {
    groupedTables[section].sort((a, b) => a.tableNumber - b.tableNumber);
  });
  
  const getOrderCount = (tableId) => {
    return activeOrders.filter(order => order.table._id === tableId).length;
  };
  
  const getTableNotifications = (tableId) => {
    return notifications.filter(
      n => !n.read && (n.type === 'ready' || n.type === 'order') && n.data?.tableId === tableId
    ).length;
  };

  const renderJoinedTableIndicator = (table) => {
    if (!table.isJoined && !table.parentTable) {
      return null;
    }
    
    let joinedCount = 1; 
    let tooltipText = 'Mesa unida';
    
    if (table.isJoined) {
      if (table.joinedWith && Array.isArray(table.joinedWith)) {
        joinedCount += table.joinedWith.length;
        tooltipText = `Mesa unida com ${table.joinedWith.length} outras`;
      } else {
        tooltipText = 'Mesa unida com outras mesas';
      }
    } else if (table.parentTable) {
      tooltipText = 'Esta mesa faz parte de uma união';
    }
    
    return (
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          left: -8,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}
      >
        <Tooltip title={tooltipText}>
          <Badge
            badgeContent={joinedCount > 1 ? joinedCount : null}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.7rem',
                height: 18,
                minWidth: 18
              }
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
                animation: table.isJoined ? `${pulseBorder} 2s infinite` : 'none'
              }}
            >
              <LinkIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
            </Box>
          </Badge>
        </Tooltip>
      </Box>
    );
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
                      height: '100%',
                      display: 'flex',
                      bgcolor: table.status === 'occupied' 
                        ? '#FFC107 !important' 
                        : table.status === 'available' 
                          ? '#4CAF50 !important' 
                          : table.status === 'reserved' 
                            ? '#FF9800 !important' 
                            : 'inherit',
                      color: table.status === 'occupied' 
                        ? 'black !important' 
                        : 'white !important',
                      // Estilos para mesas unidas disponíveis (azul)
                      ...(table.isJoined && table.status === 'available' && {
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: 'primary.main',
                        backgroundImage: 
                          'linear-gradient(90deg, rgba(63,81,181,0.05) 50%, rgba(63,81,181,0.1) 50%)',
                        backgroundSize: '20px 100%',
                        animation: `${waveAnimation} 20s linear infinite, ${pulseBorder} 2s infinite`,
                        boxShadow: theme => `0 0 10px ${theme.palette.primary.main}`
                      }),
                      // Estilos melhorados para mesas unidas ocupadas (amarelo/laranja)
                      ...(table.isJoined && table.status === 'occupied' && {
                        borderWidth: 3,
                        borderStyle: 'solid',
                        borderColor: 'warning.main',
                        backgroundImage: 
                          'linear-gradient(45deg, rgba(255, 152, 0, 0.15) 25%, rgba(255, 152, 0, 0.25) 25%, rgba(255, 152, 0, 0.25) 50%, rgba(255, 152, 0, 0.15) 50%, rgba(255, 152, 0, 0.15) 75%, rgba(255, 152, 0, 0.25) 75%, rgba(255, 152, 0, 0.25) 100%)',
                        backgroundSize: '30px 30px',
                        animation: `
                          ${waveAnimation} 15s linear infinite, 
                          ${pulseOccupiedAnimation} 2s infinite,
                          ${glowAnimation} 3s infinite,
                          ${borderPulseAnimation} 2s infinite
                        `,
                        boxShadow: '0 0 20px rgba(255, 152, 0, 0.7)'
                      }),
                      // Estilos para mesas virtuais - agora mostradas, mas com estilo diferente
                      ...(table.isVirtual && {
                        opacity: 0.9,
                        filter: 'grayscale(0.2)',
                        border: '2px dashed',
                        borderColor: theme => 
                          table.status === 'occupied' 
                            ? theme.palette.warning.main 
                            : theme.palette.primary.main,
                        // Fundo especial para mesa virtual ocupada
                        ...(table.status === 'occupied' && {
                          backgroundImage: 
                            'linear-gradient(45deg, rgba(255, 152, 0, 0.15) 25%, rgba(255, 152, 0, 0.25) 25%, rgba(255, 152, 0, 0.25) 50%, rgba(255, 152, 0, 0.15) 50%, rgba(255, 152, 0, 0.15) 75%, rgba(255, 152, 0, 0.25) 75%, rgba(255, 152, 0, 0.25) 100%)',
                          backgroundSize: '30px 30px',
                          animation: `${waveAnimation} 15s linear infinite`,
                          boxShadow: '0 0 15px rgba(255, 152, 0, 0.5)'
                        })
                      })
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
                    
                    {renderJoinedTableIndicator(table)}
                    
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
                      
                      {(table.isJoined || table.isVirtual) && (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 1, 
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 8,
                            bgcolor: table.status === 'occupied' 
                              ? 'rgba(255, 152, 0, 0.15)' 
                              : 'rgba(63, 81, 181, 0.15)',
                            border: '1px solid',
                            borderColor: table.status === 'occupied' 
                              ? 'warning.main' 
                              : 'primary.main',
                          }}
                        >
                          <LinkIcon 
                            fontSize="small" 
                            sx={{ 
                              mr: 1, 
                              color: table.status === 'occupied' 
                                ? theme.palette.warning.main 
                                : theme.palette.primary.main 
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 'medium',
                              color: table.status === 'occupied' 
                                ? theme.palette.warning.main 
                                : theme.palette.primary.main
                            }}
                          >
                            {table.isJoined 
                              ? `Mesa Principal (${table.joinedWith?.length || 0} unidas)` 
                              : 'Mesa Secundária'}
                          </Typography>
                        </Box>
                      )}
                      
                      {table.isJoined && table.joinedWith && table.joinedWith.length > 0 && (
                        <Box sx={{ 
                          mt: 1,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: 'rgba(0,0,0,0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}>
                          <Typography variant="caption" color="textSecondary" sx={{ opacity: 0.9, fontWeight: 'medium' }}>
                            Mesa unida com:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mt: 0.5 }}>
                            {(Array.isArray(table.joinedWith) ? table.joinedWith : []).map(joinedTable => {
                              // Pode ser um objeto já populado ou apenas um ID
                              const tableId = typeof joinedTable === 'object' ? joinedTable._id : joinedTable;
                              const tableNumber = typeof joinedTable === 'object' 
                                ? joinedTable.tableNumber 
                                : tables.find(t => t._id === tableId)?.tableNumber;
                              
                              return tableNumber ? (
                                <Chip 
                                  key={tableId}
                                  label={tableNumber}
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    height: 20, 
                                    fontSize: '0.7rem',
                                    borderColor: table.status === 'occupied' ? 'warning.main' : 'primary.main',
                                    color: table.status === 'occupied' ? 'warning.main' : 'primary.main',
                                  }}
                                />
                              ) : null;
                            })}
                          </Box>
                        </Box>
                      )}
                      
                      {table.status === 'occupied' && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ReceiptIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.text.secondary }} />
                          <Typography variant="body2" color="text.secondary">
                            {getOrderCount(table._id)} pedidos
                          </Typography>
                        </Box>
                      )}
                      
                      {/* Texto alternativo quando a mesa faz parte de uma união */}
                      {table.isVirtual && table.parentTable && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 1,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: 'rgba(0,0,0,0.1)'
                        }}>
                          <LinkIcon fontSize="small" sx={{ 
                            mr: 0.5, 
                            color: table.status === 'occupied' 
                              ? theme.palette.warning.main 
                              : theme.palette.primary.main 
                          }} />
                          <Typography variant="body2" fontWeight="medium" color={
                            table.status === 'occupied' 
                              ? theme.palette.warning.main 
                              : theme.palette.primary.main
                          }>
                            {/* Usar objeto parentTable se estiver populado ou procurar pelo ID se não estiver */}
                            Parte da Mesa {
                              typeof table.parentTable === 'object' && table.parentTable 
                                ? table.parentTable.tableNumber 
                                : tables.find(t => t._id === (
                                    typeof table.parentTable === 'string' 
                                      ? table.parentTable 
                                      : table.parentTable?._id
                                  ))?.tableNumber || '?'
                            }
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

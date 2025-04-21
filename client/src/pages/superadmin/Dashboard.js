import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Button,
  Alert,
  useTheme
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import AppLayout from '../../components/layout/AppLayout';
import TableStatusMap from '../../components/tables/TableStatusMap';
import OrdersList from '../../components/orders/OrdersList';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [occupancyPrediction, setOccupancyPrediction] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Get dashboard summary
        const summaryResponse = await axios.get('/api/dashboard/summary');
        
        // Get occupancy predictions
        const predictionsResponse = await axios.get('/api/dashboard/predictions/occupancy');
        
        // Get active orders
        const ordersResponse = await axios.get('/api/orders/status/active');
        
        setDashboardData(summaryResponse.data);
        setOccupancyPrediction(predictionsResponse.data);
        setActiveOrders(ordersResponse.data);
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        setError('Erro ao carregar dados do dashboard. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data for occupancy prediction
  const prepareOccupancyChartData = () => {
    if (!occupancyPrediction?.hourlyPredictions) return null;
    
    const labels = occupancyPrediction.hourlyPredictions.map(h => `${h.hour}:00`);
    const predictedCustomers = occupancyPrediction.hourlyPredictions.map(h => h.predictedCustomers);
    
    return {
      labels,
      datasets: [
        {
          label: 'Previsão de Clientes',
          data: predictedCustomers,
          borderColor: theme.palette.primary.main,
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  };

  // Prepare chart data for table status
  const prepareTableStatusChart = () => {
    if (!dashboardData?.tables) return null;
    
    return {
      labels: ['Disponíveis', 'Ocupadas'],
      datasets: [
        {
          data: [dashboardData.tables.available, dashboardData.tables.occupied],
          backgroundColor: [
            '#4CAF50', // green for available
            '#FFC107', // yellow for occupied
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Previsão de Ocupação',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  const doughnutChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Status das Mesas',
      },
    },
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
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Tables Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ 
            bgcolor: 'primary.light', 
            color: 'primary.dark',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2">Mesas</Typography>
                <Typography variant="h4">{dashboardData?.tables.total || 0}</Typography>
              </Box>
              <Box sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TableRestaurantIcon fontSize="large" />
              </Box>
            </Box>
            <Box sx={{ 
              bgcolor: 'background.paper', 
              p: 2.5,
              mt: 'auto',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dashboardData?.tables.available || 0} disponíveis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboardData?.tables.occupied || 0} ocupadas
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Orders Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ 
            bgcolor: 'secondary.light', 
            color: 'secondary.dark',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2">Pedidos Hoje</Typography>
                <Typography variant="h4">{dashboardData?.orders.today || 0}</Typography>
              </Box>
              <Box sx={{ 
                bgcolor: 'secondary.main', 
                color: 'white',
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ReceiptIcon fontSize="large" />
              </Box>
            </Box>
            <Box sx={{ 
              bgcolor: 'background.paper', 
              p: 2.5,
              mt: 'auto',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dashboardData?.orders.active || 0} ativos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboardData?.orders.completed || 0} completos
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Revenue */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ 
            bgcolor: 'success.light', 
            color: 'success.dark',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2">Faturamento</Typography>
                <Typography variant="h4">
                  R$ {dashboardData?.revenue.today.toFixed(2) || '0.00'}
                </Typography>
              </Box>
              <Box sx={{ 
                bgcolor: 'success.main', 
                color: 'white',
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUpIcon fontSize="large" />
              </Box>
            </Box>
            <Box sx={{ 
              bgcolor: 'background.paper', 
              p: 2.5,
              mt: 'auto',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8
            }}>
              <Typography variant="body2" color="text.secondary">
                {dashboardData?.revenue.growth > 0 ? '+' : ''}{dashboardData?.revenue.growth || 0}% vs. ontem
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ 
            bgcolor: 'info.light', 
            color: 'info.dark',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2">Garçons Ativos</Typography>
                <Typography variant="h4">{dashboardData?.users.waiters || 0}</Typography>
              </Box>
              <Box sx={{ 
                bgcolor: 'info.main', 
                color: 'white',
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PeopleIcon fontSize="large" />
              </Box>
            </Box>
            <Box sx={{ 
              bgcolor: 'background.paper', 
              p: 2.5,
              mt: 'auto',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8
            }}>
              <Typography variant="body2" color="text.secondary">
                Total de usuários: {dashboardData?.users.total || 0}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Restaurant Map and Active Orders */}
      <Grid container spacing={3}>
        {/* Restaurant Map */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, px: 1 }}>
              Mapa do Restaurante
            </Typography>
            <Box sx={{ 
              flex: 1, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              p: 1,
              position: 'relative',
              minHeight: 300
            }}>
              <TableStatusMap />
            </Box>
          </Paper>
        </Grid>
        
        {/* Active Orders */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, px: 1 }}>
              Pedidos Ativos
            </Typography>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <OrdersList orders={activeOrders} />
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => window.location.href = '/orders'}
              >
                Ver Todos os Pedidos
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts Row */}
      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Occupancy Prediction */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Previsão de Ocupação Hoje
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Baseado em dados históricos para {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
            </Typography>
            {prepareOccupancyChartData() ? (
              <Box sx={{ height: 350, mt: 2 }}>
                <Line data={prepareOccupancyChartData()} options={lineChartOptions} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <Typography color="text.secondary">
                  Dados de previsão insuficientes
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Table Status Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Status das Mesas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ocupação atual: {dashboardData?.tables.occupancyRate?.toFixed(0) || 0}%
            </Typography>
            {prepareTableStatusChart() ? (
              <Box sx={{ height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Doughnut data={prepareTableStatusChart()} options={doughnutChartOptions} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <Typography color="text.secondary">
                  Nenhuma mesa configurada
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Popular Items */}
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Itens Mais Populares
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {dashboardData?.topSellingItems && dashboardData.topSellingItems.length > 0 ? (
            dashboardData.topSellingItems.map((item, index) => (
              <Grid item xs={12} sm={6} md={2.4} key={item.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                      {index + 1}. {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {item.category}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                      {item.orderCount} pedidos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography color="text.secondary">
                  Nenhum dado de pedido disponível
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    </AppLayout>
  );
};

export default SuperAdminDashboard;

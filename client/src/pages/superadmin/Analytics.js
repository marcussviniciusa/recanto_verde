import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  useTheme
} from '@mui/material';
import { 
  Line,
  Bar,
  Pie
} from 'react-chartjs-2';
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
  Filler
} from 'chart.js';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FoodBankIcon from '@mui/icons-material/FoodBank';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PeopleIcon from '@mui/icons-material/People';
import axios from 'axios';
import AppLayout from '../../components/layout/AppLayout';

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
  Legend,
  Filler
);

const Analytics = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/dashboard/analytics?timeRange=${timeRange}`);
        setAnalyticsData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Erro ao carregar dados analíticos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  // Mock data for development
  const mockAnalyticsData = {
    summary: {
      revenue: 9850.50,
      orders: 124,
      averageTicket: 79.44,
      customers: 310,
      tableTurnover: 4.2
    },
    sales: {
      labels: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
      data: [1250, 1450, 1300, 1500, 1800, 1950, 1600]
    },
    topItems: {
      labels: ['Picanha', 'Camarão', 'Salmão', 'Filé Mignon', 'Paella'],
      data: [45, 38, 32, 28, 22]
    },
    categoryDistribution: {
      labels: ['Entradas', 'Pratos Principais', 'Sobremesas', 'Bebidas', 'Acompanhamentos'],
      data: [15, 40, 12, 25, 8]
    },
    hourlyTraffic: {
      labels: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
      data: [15, 30, 25, 10, 5, 8, 20, 45, 60, 55, 35, 10]
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return `R$ ${parseFloat(value).toFixed(2)}`;
  };

  // Use mock data for now (would be replaced with real data in production)
  const data = analyticsData || mockAnalyticsData;

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `R$ ${context.raw.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return `R$ ${value}`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right'
      }
    }
  };

  // Chart data
  const salesChartData = {
    labels: data.sales.labels,
    datasets: [
      {
        label: 'Receita',
        data: data.sales.data,
        fill: true,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: theme.palette.primary.main,
        tension: 0.4
      }
    ]
  };

  const topItemsChartData = {
    labels: data.topItems.labels,
    datasets: [
      {
        label: 'Quantidade vendida',
        data: data.topItems.data,
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.primary.light,
          theme.palette.secondary.main,
          theme.palette.secondary.light,
          theme.palette.info.main
        ],
        borderWidth: 1
      }
    ]
  };

  const categoryChartData = {
    labels: data.categoryDistribution.labels,
    datasets: [
      {
        label: 'Distribuição por categoria',
        data: data.categoryDistribution.data,
        backgroundColor: [
          '#4CAF50',
          '#FFC107',
          '#2196F3',
          '#9C27B0',
          '#FF5722'
        ],
        borderWidth: 1
      }
    ]
  };

  const trafficChartData = {
    labels: data.hourlyTraffic.labels,
    datasets: [
      {
        label: 'Tráfego por hora',
        data: data.hourlyTraffic.data,
        backgroundColor: theme.palette.secondary.main,
        borderColor: theme.palette.secondary.dark,
        borderWidth: 1
      }
    ]
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Análise de Desempenho
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualize dados de desempenho do restaurante para tomar decisões estratégicas.
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filter toolbar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Período</InputLabel>
              <Select
                value={timeRange}
                label="Período"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="day">Hoje</MenuItem>
                <MenuItem value="week">Esta semana</MenuItem>
                <MenuItem value="month">Este mês</MenuItem>
                <MenuItem value="quarter">Este trimestre</MenuItem>
                <MenuItem value="year">Este ano</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPI summary cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MonetizationOnIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Receita Total
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatCurrency(data.summary.revenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <RestaurantIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Pedidos
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {data.summary.orders}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FoodBankIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Ticket Médio
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatCurrency(data.summary.averageTicket)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PeopleIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Clientes
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {data.summary.customers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4} lg={2.4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Giro de Mesas
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {data.summary.tableTurnover} x
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Receita por Dia
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line options={lineChartOptions} data={salesChartData} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Distribuição por Categoria
                </Typography>
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <Pie options={pieChartOptions} data={categoryChartData} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Itens Mais Vendidos
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar options={barChartOptions} data={topItemsChartData} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tráfego por Hora
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar options={barChartOptions} data={trafficChartData} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </AppLayout>
  );
};

export default Analytics;

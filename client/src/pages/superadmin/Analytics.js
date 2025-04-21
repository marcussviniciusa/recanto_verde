import React, { useState, useEffect, useRef } from 'react';
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
  useTheme,
  Button,
  Tooltip as MuiTooltip,
  Divider
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
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FoodBankIcon from '@mui/icons-material/FoodBank';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PeopleIcon from '@mui/icons-material/People';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  ChartTooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [usingMockData, setUsingMockData] = useState(false);

  // Referências para os gráficos para exportação
  const salesChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const topItemsChartRef = useRef(null);
  const trafficChartRef = useRef(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fazer requisição ao servidor para obter dados reais
        const response = await axios.get(`/api/dashboard/analytics?timeRange=${timeRange}`);
        console.log('Dados analíticos recebidos:', response.data);
        
        // Processar os dados recebidos
        setAnalyticsData(response.data);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Erro ao carregar dados analíticos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  useEffect(() => {
    setUsingMockData(!analyticsData);
  }, [analyticsData]);

  // Função para exportar os dados em CSV
  const exportToCSV = () => {
    try {
      // Cabeçalho do CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Dados do resumo
      csvContent += "RESUMO DOS DADOS\r\n";
      csvContent += "Métrica,Valor\r\n";
      csvContent += `Receita Total,${data.summary.revenue}\r\n`;
      csvContent += `Número de Pedidos,${data.summary.orders}\r\n`;
      csvContent += `Ticket Médio,${data.summary.averageTicket}\r\n`;
      csvContent += `Clientes,${data.summary.customers}\r\n`;
      csvContent += `Giro de Mesas,${data.summary.tableTurnover}\r\n\r\n`;
      
      // Dados de vendas por dia
      csvContent += "VENDAS DIÁRIAS\r\n";
      csvContent += "Dia,Valor\r\n";
      data.sales.labels.forEach((day, index) => {
        csvContent += `${day},${data.sales.data[index]}\r\n`;
      });
      csvContent += "\r\n";
      
      // Dados de itens mais vendidos
      csvContent += "ITENS MAIS VENDIDOS\r\n";
      csvContent += "Item,Quantidade\r\n";
      data.topItems.labels.forEach((item, index) => {
        csvContent += `${item},${data.topItems.data[index]}\r\n`;
      });
      csvContent += "\r\n";
      
      // Dados de distribuição por categoria
      csvContent += "DISTRIBUIÇÃO POR CATEGORIA\r\n";
      csvContent += "Categoria,Quantidade\r\n";
      data.categoryDistribution.labels.forEach((category, index) => {
        csvContent += `${category},${data.categoryDistribution.data[index]}\r\n`;
      });
      csvContent += "\r\n";
      
      // Dados de tráfego por hora
      csvContent += "TRÁFEGO HORÁRIO\r\n";
      csvContent += "Hora,Quantidade\r\n";
      data.hourlyTraffic.labels.forEach((hour, index) => {
        csvContent += `${hour},${data.hourlyTraffic.data[index]}\r\n`;
      });
      
      // Criar link para download e disparar o clique
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_analitico_${timeRange}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      setError('Não foi possível exportar os dados. Tente novamente.');
    }
  };

  // Função para recarregar os dados
  const refreshData = () => {
    setLoading(true);
    setAnalyticsData(null);
    // O useEffect vai cuidar de buscar os dados novamente
  };

  // Dados simulados como fallback se a API falhar
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

  // Use os dados reais da API com fallback para dados mock
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
      
      {usingMockData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Exibindo dados simulados. Os dados reais serão carregados quando houver pedidos registrados no sistema.
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
          
          <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <MuiTooltip title="Recarregar dados">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={refreshData}
                sx={{ mr: 2 }}
                disabled={loading}
              >
                Atualizar
              </Button>
            </MuiTooltip>
            
            <MuiTooltip title="Exportar dados para CSV">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={loading}
              >
                Exportar Dados
              </Button>
            </MuiTooltip>
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
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
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
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
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
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
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
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
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
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
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
              <Paper elevation={3} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Receita por Dia
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: {formatCurrency(data.sales.data.reduce((a, b) => a + b, 0))}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ height: 300 }}>
                  <Line ref={salesChartRef} options={lineChartOptions} data={salesChartData} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Paper elevation={3} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Distribuição por Categoria
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.categoryDistribution.labels.length} categorias
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <Pie ref={categoryChartRef} options={pieChartOptions} data={categoryChartData} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Itens Mais Vendidos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Top 5 produtos
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ height: 300 }}>
                  <Bar ref={topItemsChartRef} options={barChartOptions} data={topItemsChartData} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Tráfego por Hora
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: {data.hourlyTraffic.data.reduce((a, b) => a + b, 0)} pedidos
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ height: 300 }}>
                  <Bar ref={trafficChartRef} options={barChartOptions} data={trafficChartData} />
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

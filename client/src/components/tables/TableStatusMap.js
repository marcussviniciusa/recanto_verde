import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tooltip, 
  CircularProgress,
  Alert
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const TableStatusMap = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();
  
  // Fetch tables data
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tables');
        
        // Verifica se as mesas têm posições definidas, caso contrário reorganiza automaticamente
        const fetchedTables = response.data;
        const needsReorganization = fetchedTables.some(table => 
          !table.position || table.position.x === undefined || table.position.y === undefined
        );
        
        // Organiza automaticamente se necessário
        const organizedTables = needsReorganization 
          ? reorganizeTables(fetchedTables) 
          : fetchedTables;
        
        setTables(organizedTables);
        setError(null);
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError('Erro ao carregar mesas. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
    
    // Set up polling for real-time updates (as a fallback to socket updates)
    const interval = setInterval(fetchTables, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Função para organizar automaticamente as mesas (simplificada para o dashboard)
  const reorganizeTables = (allTables) => {
    const groupedBySection = {};
    
    // Agrupa as mesas por seção
    allTables.forEach(table => {
      const section = table.section || 'main';
      if (!groupedBySection[section]) {
        groupedBySection[section] = [];
      }
      groupedBySection[section].push(table);
    });
    
    let reorganized = [];
    
    // Para cada seção, organiza as mesas em grade
    Object.keys(groupedBySection).forEach(section => {
      const sectionTables = groupedBySection[section]
        .sort((a, b) => a.tableNumber - b.tableNumber);
      
      // Configurações de grade para cada seção
      const gridColumns = 4; // 4 mesas por linha
      const spacingX = 5; // Espaçamento horizontal
      const spacingY = 5; // Espaçamento vertical
      
      // Reorganiza cada mesa na seção
      sectionTables.forEach((table, index) => {
        const row = Math.floor(index / gridColumns);
        const column = index % gridColumns;
        
        // Calcula o tamanho baseado na capacidade
        const tableSize = getTableSizeBasedOnCapacity(table.capacity);
        
        // Calcula a posição considerando o tamanho
        const x = 3 + (column * spacingX);
        const y = 3 + (row * spacingY);
        
        // Atualiza a posição
        table.position = { x, y };
        table._size = tableSize; // Armazena o tamanho para uso posterior
        
        reorganized.push(table);
      });
    });
    
    return reorganized;
  };
  
  // Determina o tamanho relativo da mesa com base na capacidade
  const getTableSizeBasedOnCapacity = (capacity) => {
    // Tamanhos base para mesas de acordo com a capacidade
    if (capacity <= 2) return 0.8; // Mesa pequena (80% do tamanho padrão)
    if (capacity <= 4) return 1.0; // Mesa padrão
    if (capacity <= 8) return 1.3; // Mesa média (30% maior)
    return 1.6; // Mesa grande (60% maior)
  };
  
  // Handle table click - navigate to table details
  const handleTableClick = (table) => {
    if (user.role === 'superadmin') {
      navigate(`/tables?selected=${table._id}`);
    } else {
      navigate(`/table/${table._id}`);
    }
  };
  
  // Get table status color class
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
  
  // Get time elapsed since table was occupied (for occupied tables)
  const getOccupiedTime = (occupiedAt) => {
    if (!occupiedAt) return null;
    
    const now = new Date();
    const occupied = new Date(occupiedAt);
    const diffMs = now - occupied;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h${mins}min`;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    );
  }

  if (tables.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 300 
      }}>
        <TableRestaurantIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
        <Typography color="text.secondary">
          Nenhuma mesa configurada
        </Typography>
        {user.role === 'superadmin' && (
          <Typography variant="body2" color="primary" sx={{ mt: 1, cursor: 'pointer' }}
            onClick={() => navigate('/tables')}>
            Clique aqui para configurar mesas
          </Typography>
        )}
      </Box>
    );
  }

  // Define a grid system for better organization
  const gridSize = 25; // Pixel size of each grid unit

  return (
    <Box sx={{ 
      position: 'relative',
      height: '100%',
      minHeight: 400,
      border: '1px dashed #ccc',
      borderRadius: 1,
      p: 2,
      backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${gridSize - 1}px, rgba(0,0,0,0.05) ${gridSize}px), 
                      repeating-linear-gradient(90deg, transparent, transparent ${gridSize - 1}px, rgba(0,0,0,0.05) ${gridSize}px)`,
      backgroundSize: `${gridSize}px ${gridSize}px`,
      overflow: 'auto',
    }}>
      {tables.map(table => {
        // Calculate size based on capacity
        const sizeMultiplier = table._size || getTableSizeBasedOnCapacity(table.capacity);
        const baseSize = 70; // Base size in pixels
        const tableSize = Math.round(baseSize * sizeMultiplier);
        
        return (
          <Tooltip
            key={table._id}
            title={
              <Box>
                <Typography variant="subtitle2">
                  Mesa {table.tableNumber}
                </Typography>
                <Typography variant="body2">
                  Status: {table.status === 'available' ? 'Disponível' : table.status === 'occupied' ? 'Ocupada' : 'Reservada'}
                </Typography>
                <Typography variant="body2">
                  Capacidade: {table.capacity} pessoas
                </Typography>
                {table.status === 'occupied' && (
                  <>
                    <Typography variant="body2">
                      Garçom: {table.assignedWaiter?.name || 'Não atribuído'}
                    </Typography>
                    {table.occupiedAt && (
                      <Typography variant="body2">
                        Tempo: {getOccupiedTime(table.occupiedAt)}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            }
            arrow
            placement="top"
          >
            <Paper
              elevation={3}
              className={getTableStatusClass(table.status)}
              sx={{
                position: 'absolute',
                left: `${table.position.x * gridSize}px`,
                top: `${table.position.y * gridSize}px`,
                width: tableSize,
                height: tableSize,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px', // Mesa quadrada com cantos suavizados
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6,
                },
                border: '2px solid rgba(255,255,255,0.7)',
              }}
              onClick={() => handleTableClick(table)}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {table.tableNumber}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  {table.capacity}
                </Typography>
              </Box>
              {table.status === 'occupied' && table.occupiedAt && (
                <Typography variant="caption" sx={{ 
                  position: 'absolute', 
                  bottom: 4, 
                  bgcolor: 'rgba(0,0,0,0.15)',
                  px: 1,
                  borderRadius: 5,
                  fontSize: '0.7rem'
                }}>
                  {getOccupiedTime(table.occupiedAt)}
                </Typography>
              )}
            </Paper>
          </Tooltip>
        );
      })}
      
      {/* Legend */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 8, 
        right: 8, 
        display: 'flex',
        bgcolor: 'rgba(255,255,255,0.8)',
        p: 1,
        borderRadius: 1,
        boxShadow: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            bgcolor: '#4CAF50', 
            borderRadius: '50%',
            mr: 0.5
          }} />
          <Typography variant="caption">Disponível</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            bgcolor: '#FFC107', 
            borderRadius: '50%',
            mr: 0.5 
          }} />
          <Typography variant="caption">Ocupada</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            bgcolor: '#FF9800', 
            borderRadius: '50%',
            mr: 0.5 
          }} />
          <Typography variant="caption">Reservada</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TableStatusMap;

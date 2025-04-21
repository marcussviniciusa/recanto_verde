import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tooltip, 
  CircularProgress,
  Badge,
  IconButton,
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
  const { emitTableUpdate } = useSocket();
  const { user } = useAuth();
  
  // Fetch tables data
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tables');
        setTables(response.data);
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

  // Calculate grid dimensions based on tables positions
  const maxX = Math.max(...tables.map(table => table.position.x)) + 1;
  const maxY = Math.max(...tables.map(table => table.position.y)) + 1;

  return (
    <Box sx={{ 
      position: 'relative',
      height: '100%',
      minHeight: 400,
      border: '1px dashed #ccc',
      borderRadius: 1,
      p: 1,
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,0,0,0.05) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,0,0,0.05) 20px)',
      backgroundSize: '20px 20px',
    }}>
      {tables.map(table => (
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
        >
          <Paper
            elevation={3}
            className={getTableStatusClass(table.status)}
            sx={{
              position: 'absolute',
              left: `${(table.position.x / maxX) * 100}%`,
              top: `${(table.position.y / maxY) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translate(-50%, -50%) scale(1.05)',
                boxShadow: 6,
              },
            }}
            onClick={() => handleTableClick(table)}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {table.tableNumber}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">
                {table.capacity}
              </Typography>
            </Box>
          </Paper>
        </Tooltip>
      ))}
      
      {/* Legend */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 8, 
        right: 8, 
        display: 'flex',
        bgcolor: 'rgba(255,255,255,0.8)',
        p: 1,
        borderRadius: 1
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

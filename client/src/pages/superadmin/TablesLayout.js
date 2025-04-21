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
  Tooltip,
  Divider,
  Slider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

const TablesLayout = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedTableId = queryParams.get('selected');
  
  // State
  const [tables, setTables] = useState([]);
  const [sections, setSections] = useState(['main']);
  const [currentSection, setCurrentSection] = useState('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [gridSize, setGridSize] = useState(20); // Grid size in pixels
  
  // Table dialog state
  const [tableDialog, setTableDialog] = useState({
    open: false,
    isEdit: false,
    table: {
      tableNumber: '',
      capacity: 4,
      section: 'main',
      position: { x: 0, y: 0 }
    }
  });
  
  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    table: null
  });
  
  // Fetch tables data
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tables');
        setTables(response.data);
        
        // Extract unique sections
        const uniqueSections = [...new Set(response.data.map(table => table.section || 'main'))];
        setSections(uniqueSections.length > 0 ? uniqueSections : ['main']);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError('Erro ao carregar mesas. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
  }, []);
  
  // If a selected table ID is provided, open edit dialog for that table
  useEffect(() => {
    if (selectedTableId && tables.length > 0) {
      const selectedTable = tables.find(table => table._id === selectedTableId);
      if (selectedTable) {
        handleEditTable(selectedTable);
      }
    }
  }, [selectedTableId, tables]);
  
  // Generate automatic position for a new table
  const generateAutoPosition = () => {
    // Get tables in current section
    const sectionTables = tables.filter(table => table.section === currentSection);
    
    if (sectionTables.length === 0) {
      // First table in section, place at center
      return { x: 5, y: 5 };
    }
    
    // Find next available spot in a grid pattern
    const usedPositions = new Set();
    sectionTables.forEach(table => {
      const pos = `${table.position?.x || 0},${table.position?.y || 0}`;
      usedPositions.add(pos);
    });
    
    // Try to find a position in a grid-like pattern
    const maxX = Math.max(...sectionTables.map(t => t.position?.x || 0)) + 3;
    const maxY = Math.max(...sectionTables.map(t => t.position?.y || 0)) + 3;
    
    // Start with a 5x5 grid and expand outward
    for (let y = 1; y <= maxY; y++) {
      for (let x = 1; x <= maxX; x++) {
        if (!usedPositions.has(`${x},${y}`)) {
          return { x, y };
        }
      }
    }
    
    // If all positions are taken, add to the right
    return { x: maxX, y: 1 };
  };
  
  // Handle adding a new table
  const handleAddTable = () => {
    // Find the next available table number
    const tableNumbers = tables.map(table => table.tableNumber);
    let nextTableNumber = 1;
    
    while (tableNumbers.includes(nextTableNumber)) {
      nextTableNumber++;
    }
    
    // Generate automatic position
    const autoPosition = generateAutoPosition();
    
    setTableDialog({
      open: true,
      isEdit: false,
      table: {
        tableNumber: nextTableNumber,
        capacity: 4,
        section: currentSection,
        position: autoPosition
      }
    });
  };
  
  // Handle editing a table
  const handleEditTable = (table) => {
    setTableDialog({
      open: true,
      isEdit: true,
      table: { ...table }
    });
  };
  
  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    setTableDialog({
      ...tableDialog,
      table: {
        ...tableDialog.table,
        [name]: value
      }
    });
  };
  
  // Handle position change
  const handlePositionChange = (axis, value) => {
    setTableDialog({
      ...tableDialog,
      table: {
        ...tableDialog.table,
        position: {
          ...tableDialog.table.position,
          [axis]: parseInt(value)
        }
      }
    });
  };
  
  // Handle section change
  const handleSectionChange = (e) => {
    setCurrentSection(e.target.value);
  };
  
  // Handle save table
  const handleSaveTable = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const { table, isEdit } = tableDialog;
      
      // Validate form
      if (!table.tableNumber || table.capacity < 1) {
        setError('Por favor, preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }
      
      let response;
      
      if (isEdit) {
        // Update existing table
        response = await axios.put(`/api/tables/${table._id}`, table);
        
        // Update local state
        setTables(tables.map(t => 
          t._id === table._id ? response.data : t
        ));
        
        setSuccess('Mesa atualizada com sucesso!');
      } else {
        // Create new table
        response = await axios.post('/api/tables', table);
        
        // Add to local state
        setTables([...tables, response.data]);
        
        setSuccess('Mesa adicionada com sucesso!');
      }
      
      // Close dialog
      setTableDialog({
        ...tableDialog,
        open: false
      });
    } catch (err) {
      console.error('Error saving table:', err);
      setError('Erro ao salvar mesa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Delete the table
      await axios.delete(`/api/tables/${deleteDialog.table._id}`);
      
      // Update local state
      setTables(tables.filter(table => table._id !== deleteDialog.table._id));
      
      setSuccess('Mesa removida com sucesso!');
      
      // Close dialog
      setDeleteDialog({
        open: false,
        table: null
      });
    } catch (err) {
      console.error('Error deleting table:', err);
      setError('Erro ao remover mesa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get tables for current section
  const sectionTables = tables.filter(table => (table.section || 'main') === currentSection);
  
  // Handle drag start - Simplified and more reliable
  const handleDragStart = (table, e) => {
    // Prevent default behaviors
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
    e.stopPropagation();
    
    // Get the correct client coordinates
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (!clientX || !clientY) return; // Bail if we don't have coordinates
    
    // Calculate the initial mouse position
    const startX = clientX;
    const startY = clientY;
    
    // Get initial table position (with fallbacks)
    const initialX = table.position?.x || 0;
    const initialY = table.position?.y || 0;
    
    // Find other tables for collision detection
    const otherTables = tables.filter(t => t._id !== table._id && t.section === table.section);
    
    // Set the table that's being dragged with all necessary metadata
    setDraggingTable({
      ...table,
      _dragStartPos: {
        startX,
        startY,
        initialX,
        initialY
      },
      _otherTables: otherTables,
      _isDragging: true
    });
    
    // Update tables array with dragging status
    setTables(prevTables => prevTables.map(t => 
      t._id === table._id ? {
        ...t,
        _isDragging: true,
        position: { x: initialX, y: initialY } // Ensure position is set
      } : t
    ));
    
    // Set up event listeners with delay to ensure state is updated
    setTimeout(() => {
      // Desktop events
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      // Mobile/touch events
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
      document.addEventListener('touchcancel', handleDragEnd);
    }, 0);
  };
  
  // Handle drag movement - Simplified for better performance
  const handleDragMove = (e) => {
    if (!draggingTable || !draggingTable._dragStartPos) return;
    
    // Prevent scrolling on mobile
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
    
    // Get current cursor position (with proper touch support)
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (!clientX || !clientY) return; // Safety check
    
    // Calculate grid-based movement
    const deltaX = Math.round((clientX - draggingTable._dragStartPos.startX) / gridSize);
    const deltaY = Math.round((clientY - draggingTable._dragStartPos.startY) / gridSize);
    
    // Calculate new position with minimum boundary
    let newX = Math.max(0, draggingTable._dragStartPos.initialX + deltaX);
    let newY = Math.max(0, draggingTable._dragStartPos.initialY + deltaY);
    
    // Collision detection
    let hasCollision = false;
    if (draggingTable._otherTables && draggingTable._otherTables.length > 0) {
      const tableRadius = 2; // Space needed between tables
      
      // Check each other table
      for (const otherTable of draggingTable._otherTables) {
        if (!otherTable.position) continue;
        
        const otherX = otherTable.position.x || 0;
        const otherY = otherTable.position.y || 0;
        
        // Calculate distance between tables
        const distanceSquared = (
          Math.pow(newX - otherX, 2) + 
          Math.pow(newY - otherY, 2)
        );
        
        // Using distanceSquared for performance (avoids square root)
        if (distanceSquared < Math.pow(tableRadius * 2, 2)) {
          hasCollision = true;
          break;
        }
      }
    }
    
    // Alignment snapping
    let alignedToX = false;
    let alignedToY = false;
    
    if (draggingTable._otherTables && !hasCollision) {
      const alignmentThreshold = 1;
      
      draggingTable._otherTables.forEach(otherTable => {
        if (!otherTable.position) return;
        
        const otherX = otherTable.position.x || 0;
        const otherY = otherTable.position.y || 0;
        
        // Snap to X alignment (horizontal)
        if (Math.abs(newX - otherX) < alignmentThreshold) {
          newX = otherX;
          alignedToX = true;
        }
        
        // Snap to Y alignment (vertical)
        if (Math.abs(newY - otherY) < alignmentThreshold) {
          newY = otherY;
          alignedToY = true;
        }
      });
    }
    
    // Create new dragging table state
    const updatedDraggingTable = {
      ...draggingTable,
      position: { x: newX, y: newY },
      _hasCollision: hasCollision,
      _alignedToX: alignedToX,
      _alignedToY: alignedToY
    };
    
    // Update states (optimized to avoid unnecessary re-renders)
    setDraggingTable(updatedDraggingTable);
    
    // Update tables array
    setTables(prevTables => prevTables.map(table => 
      table._id === draggingTable._id ? {
        ...table,
        _isDragging: true,
        _hasCollision: hasCollision,
        _alignedToX: alignedToX,
        _alignedToY: alignedToY,
        position: { x: newX, y: newY }
      } : table
    ));
  };
  
  // Handle drag end - Completely rewritten for reliability
  const handleDragEnd = async () => {
    // Safety check
    if (!draggingTable) return;
    
    // Always remove event listeners first to prevent memory leaks
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    document.removeEventListener('touchcancel', handleDragEnd);
    
    try {
      // Store positions for later use
      const originalPosition = {
        x: draggingTable._dragStartPos?.initialX || 0,
        y: draggingTable._dragStartPos?.initialY || 0
      };
      
      const newPosition = {
        x: draggingTable.position?.x || 0,
        y: draggingTable.position?.y || 0
      };
      
      // If collision detected, reset to original position
      if (draggingTable._hasCollision) {
        setError('Não é possível posicionar a mesa aqui pois há sobreposição com outra mesa.');
        setTimeout(() => setError(null), 3000);
        
        // Reset position in local state
        setTables(prevTables => prevTables.map(table => 
          table._id === draggingTable._id ? {
            ...table,
            position: originalPosition,
            _isDragging: false,
            _hasCollision: false,
            _alignedToX: false,
            _alignedToY: false
          } : table
        ));
        
        // Clear dragging state
        setDraggingTable(null);
        return;
      }
      
      // Check if position actually changed
      const positionChanged = 
        originalPosition.x !== newPosition.x || 
        originalPosition.y !== newPosition.y;
      
      if (positionChanged) {
        // Prepare clean table object for API
        const tableToUpdate = {
          _id: draggingTable._id,
          tableNumber: draggingTable.tableNumber,
          capacity: draggingTable.capacity,
          section: draggingTable.section,
          status: draggingTable.status,
          position: newPosition
        };
        
        // Send update to server
        await axios.put(`/api/tables/${draggingTable._id}`, tableToUpdate);
        
        // Success feedback
        setSuccess('Posição da mesa atualizada com sucesso');
        setTimeout(() => setSuccess(null), 3000);
      }
      
      // Clean up table states
      setTables(prevTables => prevTables.map(table => {
        // Create a clean copy without temporary properties
        const cleanTable = {...table};
        delete cleanTable._isDragging;
        delete cleanTable._hasCollision;
        delete cleanTable._alignedToX;
        delete cleanTable._alignedToY;
        delete cleanTable._dragStartPos;
        
        // Update dragged table with final position
        return table._id === draggingTable._id ? {
          ...cleanTable,
          position: newPosition
        } : cleanTable;
      }));
    } catch (err) {
      console.error('Error updating table position:', err);
      setError('Erro ao atualizar posição da mesa. Tente novamente.');
      
      // Reset to original position on error
      if (draggingTable._dragStartPos) {
        setTables(prevTables => prevTables.map(table => 
          table._id === draggingTable._id ? {
            ...table,
            position: {
              x: draggingTable._dragStartPos.initialX,
              y: draggingTable._dragStartPos.initialY
            },
            _isDragging: false
          } : table
        ));
      }
    } finally {
      // Always clear dragging state
      setDraggingTable(null);
    }
  };
  
  // Handle grid click to position a table
  const handleGridClick = (e) => {
    if (draggingTable) {
      const layoutEl = document.getElementById('table-layout');
      const rect = layoutEl.getBoundingClientRect();
      
      // Calculate position based on click and grid size
      const x = Math.floor((e.clientX - rect.left) / gridSize);
      const y = Math.floor((e.clientY - rect.top) / gridSize);
      
      // Update dragging table position
      const updatedTable = {
        ...draggingTable,
        position: { x, y }
      };
      
      setDraggingTable(updatedTable);
    }
  };
  
  // Get table status color class
  const getTableStatusClass = (status) => {
    switch (status) {
      case 'available':
        return '#4caf50'; // Verde
      case 'occupied':
        return '#f44336'; // Vermelho
      case 'reserved':
        return '#2196f3'; // Azul
      default:
        return '#9e9e9e'; // Cinza
    }
  };

  return (
    <AppLayout>
      {/* Header with title and primary action */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Layout de Mesas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organize visualmente as mesas do seu restaurante
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTable}
          size="large"
          sx={{ 
            bgcolor: 'primary.main',
            boxShadow: 2,
            '&:hover': { bgcolor: 'primary.dark', boxShadow: 3 }
          }}
        >
          Nova Mesa
        </Button>
      </Box>
      
      {/* Notification messages */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, boxShadow: 1 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, boxShadow: 1 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      
      {/* Layout controls with enhanced UI */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(to right, #ffffff, #f9f9ff)'
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Seção do Restaurante</InputLabel>
              <Select
                value={currentSection}
                label="Seção do Restaurante"
                onChange={handleSectionChange}
                sx={{ bgcolor: 'white' }}
              >
                {sections.map(section => (
                  <MenuItem key={section} value={section}>
                    {section === 'main' ? 'Área Principal' : section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Typography id="grid-size-slider" sx={{ fontWeight: 'medium', mb: 1 }}>
              Tamanho da Grade: {gridSize}px
            </Typography>
            <Slider
              value={gridSize}
              onChange={(e, newValue) => setGridSize(newValue)}
              aria-labelledby="grid-size-slider"
              valueLabelDisplay="auto"
              step={5}
              marks
              min={10}
              max={50}
              sx={{ color: 'primary.main' }}
            />
          </Grid>
          
          <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'info.light', p: 1, borderRadius: 1 }}>
              <DragIndicatorIcon sx={{ mr: 1, color: 'info.dark' }} />
              <Typography variant="body2" color="info.dark" sx={{ fontWeight: 'medium' }}>
                Arraste para posicionar
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Table layout area with visual improvements */}
      <Paper 
        elevation={4} 
        sx={{ 
          p: 0,
          position: 'relative',
          height: 650,
          overflow: 'hidden',
          borderRadius: 3,
          boxShadow: 3
        }}
      >
        {loading && tables.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="text.secondary">
              Carregando layout de mesas...
            </Typography>
          </Box>
        ) : sectionTables.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            background: 'linear-gradient(to bottom, #f5f5f5, #ffffff)',
            p: 4,
            borderRadius: 2
          }}>
            <TableRestaurantIcon sx={{ fontSize: 80, color: 'primary.light', mb: 3 }} />
            <Typography variant="h5" color="text.primary" sx={{ mb: 1, fontWeight: 'medium' }}>
              Nenhuma mesa nesta seção
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Adicione mesas e arraste-as para organizar o layout do seu restaurante.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTable}
              size="large"
              sx={{ mt: 2, px: 4, py: 1 }}
            >
              Criar Nova Mesa
            </Button>
          </Box>
        ) : (
          <Box 
            id="table-layout"
            sx={{ 
              position: 'relative',
              width: '100%',
              height: '100%',
              backgroundColor: '#ffffff',
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${gridSize - 1}px, rgba(0,0,0,0.05) ${gridSize}px),
                               repeating-linear-gradient(90deg, transparent, transparent ${gridSize - 1}px, rgba(0,0,0,0.05) ${gridSize}px)`,
              cursor: draggingTable ? 'grabbing' : 'default',
              transition: 'background-size 0.3s ease',
              p: 2,
              overflow: 'auto'
            }}
            onClick={handleGridClick}
            onMouseUp={handleDragEnd}
          >
            {/* Tables */}
            {sectionTables.map((table) => {
              // Use draggingTable position if this is the table being dragged
              const position = draggingTable && draggingTable._id === table._id
                ? draggingTable.position
                : table.position;
              
              return (
                <Box
                  key={table._id}
                  sx={{
                    position: 'absolute',
                    left: `${position?.x * gridSize}px`,
                    top: `${position?.y * gridSize}px`,
                    width: 100,
                    height: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '50%', // Mesas redondas
                    cursor: table._isDragging ? 'grabbing' : 'grab',
                    backgroundColor: table._hasCollision 
                      ? 'error.light' // Vermelho mais claro para colisão
                      : getTableStatusClass(table.status),
                    color: '#fff',
                    boxShadow: table._id === draggingTable?._id 
                      ? (table._hasCollision 
                          ? '0 0 0 4px rgba(211, 47, 47, 0.5), 0 8px 20px rgba(0,0,0,0.3)' // Borda vermelha para colisão
                          : '0 8px 20px rgba(0,0,0,0.3)') 
                      : '0 4px 10px rgba(0,0,0,0.15)',
                    transition: table._isDragging ? 'transform 0.1s ease, box-shadow 0.1s ease' : 'all 0.3s ease',
                    zIndex: table._id === draggingTable?._id ? 10 : 1,
                    transform: table._id === draggingTable?._id ? 'scale(1.1)' : 'scale(1)',
                    opacity: table._isDragging ? 1 : 0.95,
                    // Mostrar guias de alinhamento
                    '&::before': table._alignedToX ? {
                      content: '""',
                      position: 'absolute',
                      left: -1000,
                      right: -1000,
                      height: '2px',
                      top: 'calc(50% - 1px)',
                      backgroundColor: 'primary.main',
                      opacity: 0.6,
                      zIndex: -1
                    } : {},
                    '&::after': table._alignedToY ? {
                      content: '""',
                      position: 'absolute',
                      top: -1000,
                      bottom: -1000,
                      width: '2px',
                      left: 'calc(50% - 1px)',
                      backgroundColor: 'primary.main',
                      opacity: 0.6,
                      zIndex: -1
                    } : {},
                    '&:hover': {
                      boxShadow: '0 8px 25px rgba(0,0,0,0.25)',
                      transform: 'translateY(-5px)'
                    },
                    '&:active': {
                      cursor: 'grabbing',
                      boxShadow: '0 8px 15px rgba(0,0,0,0.3)',
                    },
                    border: '2px solid white'
                  }}
                  onMouseDown={(e) => handleDragStart(table, e)}
                  onTouchStart={(e) => handleDragStart(table, e)}
                >
                  {/* Indicador de arrasto */}
                  {table._isDragging && (
                    <Box sx={{
                      position: 'absolute',
                      top: -20,
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <Chip 
                        label="Arrastando"
                        size="small"
                        color="primary"
                        sx={{ opacity: 0.9, boxShadow: 1 }}
                      />
                    </Box>
                  )}
                  
                  {/* Número da mesa com efeito de arrasto */}
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold',
                      mb: 0.5,
                      textShadow: table._isDragging ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    {table.tableNumber}
                  </Typography>
                  
                  {/* Capacidade com ícone */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    bgcolor: 'rgba(0,0,0,0.15)',
                    borderRadius: 10,
                    px: 1,
                    py: 0.3
                  }}>
                    <PeopleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2">{table.capacity}</Typography>
                  </Box>
                  
                  {/* Indicador de colisão */}
                  {table._hasCollision && (
                    <Box sx={{
                      position: 'absolute',
                      bottom: -22,
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <Chip 
                        label="Colisão detectada"
                        size="small"
                        color="error"
                        sx={{ opacity: 0.9, boxShadow: 1 }}
                      />
                    </Box>
                  )}
                  
                  <Box sx={{
                    position: 'absolute',
                    bottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    px: 1,
                    py: 0.2
                  }}>
                    <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {table.capacity}
                    </Typography>
                  </Box>
                  
                  {/* Action buttons */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10, 
                    display: 'flex',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: 0.5,
                    boxShadow: 2,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      opacity: 1,
                    }
                  }}>
                    <IconButton 
                      size="small"
                      color="primary"
                      sx={{ mr: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTable(table);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialog({ open: true, table });
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {/* Status label */}
                  <Box sx={{ 
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: table.status === 'occupied' ? 'warning.main' :
                                    table.status === 'reserved' ? 'info.main' : 'success.main',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    borderRadius: 10,
                    px: 1,
                    py: 0.2,
                    opacity: table.status !== 'available' ? 1 : 0
                  }}>
                    {table.status === 'occupied' ? 'OCUPADA' :
                     table.status === 'reserved' ? 'RESERVADA' : ''}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
      
      {/* Legend */}
      <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Legenda:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'success.main', 
              borderRadius: 1,
              mr: 1 
            }} />
            <Typography variant="body2">Disponível</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'warning.main', 
              borderRadius: 1,
              mr: 1 
            }} />
            <Typography variant="body2">Ocupada</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'info.main', 
              borderRadius: 1,
              mr: 1 
            }} />
            <Typography variant="body2">Reservada</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <DragIndicatorIcon sx={{ mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Arraste as mesas para posicioná-las
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Table Form Dialog - Redesenhado */}
      <Dialog
        open={tableDialog.open}
        onClose={() => setTableDialog({ ...tableDialog, open: false })}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'visible'
          }
        }}
      >
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'white',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8
        }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {tableDialog.isEdit ? 'Editar Mesa' : 'Adicionar Nova Mesa'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            {tableDialog.isEdit 
              ? `Editando mesa #${tableDialog.table.tableNumber}` 
              : 'Configure os detalhes da nova mesa'}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3, pt: 4 }}>
          <Grid container spacing={3}>
            {/* Mesa preview */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: getTableStatusClass(tableDialog.table.status || 'available'),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '2px solid white',
                position: 'relative',
                mt: -5
              }}>
                <Box sx={{
                  width: '85%',
                  height: '85%',
                  borderRadius: '50%',
                  border: '2px dashed rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {tableDialog.table.tableNumber || '?'}
                  </Typography>
                </Box>
                
                <Box sx={{
                  position: 'absolute',
                  bottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(0,0,0,0.2)',
                  borderRadius: 10,
                  px: 1,
                  py: 0.2
                }}>
                  <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {tableDialog.table.capacity || 0}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Campos principais */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número da Mesa"
                name="tableNumber"
                type="number"
                value={tableDialog.table.tableNumber}
                onChange={handleFormChange}
                required
                variant="outlined"
                sx={{ mb: 2 }}
                InputProps={{ 
                  inputProps: { min: 1 },
                  startAdornment: (
                    <Box sx={{ mr: 1, color: 'text.secondary' }}>#</Box>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacidade"
                name="capacity"
                type="number"
                value={tableDialog.table.capacity}
                onChange={handleFormChange}
                required
                variant="outlined"
                sx={{ mb: 2 }}
                InputProps={{ 
                  inputProps: { min: 1 },
                  startAdornment: (
                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
                      <PeopleIcon fontSize="small" />
                    </Box>
                  ),
                }}
              />
            </Grid>
            
            {/* Seleção de seção */}
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <InputLabel>Seção</InputLabel>
                <Select
                  name="section"
                  value={tableDialog.table.section}
                  onChange={handleFormChange}
                  label="Seção"
                >
                  {sections.map(section => (
                    <MenuItem key={section} value={section}>
                      {section === 'main' ? 'Área Principal' : section}
                    </MenuItem>
                  ))}
                  <MenuItem value="new">
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                      <AddIcon fontSize="small" sx={{ mr: 1 }} />
                      Nova Seção
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Campo para nova seção */}
            {tableDialog.table.section === 'new' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome da Nova Seção"
                  name="newSection"
                  value={tableDialog.newSection || ''}
                  onChange={(e) => setTableDialog({
                    ...tableDialog,
                    newSection: e.target.value,
                    table: {
                      ...tableDialog.table,
                      section: e.target.value
                    }
                  })}
                  required
                  variant="outlined"
                  sx={{ mb: 3 }}
                />
              </Grid>
            )}
            
            {/* Posição na grade */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                  Posição na Grade
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Horizontal (X)"
                      type="number"
                      value={tableDialog.table.position?.x || 0}
                      onChange={(e) => handlePositionChange('x', e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Vertical (Y)"
                      type="number"
                      value={tableDialog.table.position?.y || 0}
                      onChange={(e) => handlePositionChange('y', e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Defina a posição ou arraste a mesa depois de criada
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setTableDialog({ ...tableDialog, open: false })}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveTable}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ 
              borderRadius: 2, 
              px: 3,
              bgcolor: 'primary.dark',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            {tableDialog.isEdit ? 'Salvar Alterações' : 'Criar Mesa'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, table: null })}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover a mesa <strong>{deleteDialog.table?.tableNumber}</strong>?
          </Typography>
          {deleteDialog.table?.status === 'occupied' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta mesa está ocupada. Remover esta mesa pode afetar pedidos em andamento.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, table: null })}>
            Cancelar
          </Button>
          <Button 
            color="error" 
            onClick={handleDeleteConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default TablesLayout;

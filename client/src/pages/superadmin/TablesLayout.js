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
  ListItemText,
  Checkbox,
  Tooltip,
  Badge
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { keyframes } from '@emotion/react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

// Definir animações para as mesas unidas
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

// Animação de padrão de onda para mesas unidas
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
  const gridSize = 25; // Tamanho fixo da grade em pixels
  
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
  
  // State para selecionar mesas para unir
  const [joiningTables, setJoiningTables] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  
  // Fetch tables data
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tables');
        
        // Verifica se as mesas têm posições definidas, caso contrário reorganiza automaticamente
        const receivedTables = response.data;
        const needsReorganization = receivedTables.some(table => 
          !table.position || table.position.x === undefined || table.position.y === undefined
        );
        
        // Se houver mesas sem posição, aplicamos a reorganização antes de mostrar
        if (needsReorganization) {
          console.log('Algumas mesas não têm posições definidas, reorganizando automaticamente...');
          
          // Organiza por seções
          const sections = [...new Set(receivedTables.map(table => table.section || 'main'))];
          
          // Reorganiza cada seção
          let reorganizedTables = [...receivedTables];
          for (const section of sections) {
            reorganizedTables = reorganizeTables(reorganizedTables, section);
          }
          
          // Salva no banco de dados
          try {
            // Atualiza as posições no servidor em massa
            await axios.post('/api/tables/update-positions', { tables: reorganizedTables });
            setTables(reorganizedTables);
          } catch (err) {
            console.error('Erro ao salvar posições reorganizadas:', err);
            setTables(receivedTables); // Usa os dados originais em caso de erro
          }
        } else {
          setTables(receivedTables);
        }
        
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
    
    // Sort tables by tableNumber to maintain layout order
    const sortedTables = [...sectionTables].sort((a, b) => a.tableNumber - b.tableNumber);
    
    // Define grid layout parameters
    const gridColumns = 5; // Tables per row
    const spacingX = 4; // Horizontal spacing between tables
    const spacingY = 4; // Vertical spacing between tables
    
    // Calculate next position based on the number of existing tables
    const tableIndex = sortedTables.length;
    const row = Math.floor(tableIndex / gridColumns);
    const column = tableIndex % gridColumns;
    
    // Calculate position 
    const x = 3 + (column * spacingX);
    const y = 3 + (row * spacingY);
    
    return { x, y };
  };
  
  // Find the next available table number
  const findNextTableNumber = () => {
    const tableNumbers = tables.map(table => table.tableNumber);
    let nextTableNumber = 1;
    
    while (tableNumbers.includes(nextTableNumber)) {
      nextTableNumber++;
    }
    
    return nextTableNumber;
  };
  
  // Handle adding a new table
  const handleAddTable = () => {
    // Find the next available table number
    const nextTableNumber = findNextTableNumber();
    
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
        // Se a capacidade mudou, talvez precisemos ajustar a posição
        const originalTable = tables.find(t => t._id === table._id);
        const capacityChanged = originalTable && originalTable.capacity !== table.capacity;
        
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
        setTables(prevTables => {
          const newTables = [...prevTables, response.data];
          
          // Reorganizar as mesas se necessário
          if (table.section === currentSection) {
            return reorganizeTables(newTables, table.section);
          }
          
          return newTables;
        });
        
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
  
  // Reorganiza as mesas em um layout organizado
  const reorganizeTables = (allTables, section) => {
    // Filtra e ordena as mesas da seção pelo número
    const sectionTables = allTables
      .filter(table => (table.section || 'main') === section)
      .sort((a, b) => a.tableNumber - b.tableNumber);
      
    // Define parâmetros do grid - ajustando para ter espaço adequado entre mesas
    const gridColumns = 4; // Reduzir para 4 mesas por linha para mais espaço
    const spacingX = 5; // Aumentar espaçamento horizontal (em unidades de grade)
    const spacingY = 5; // Aumentar espaçamento vertical (em unidades de grade)
    const paddingGrid = 2; // Espaço adicional entre mesas (em pixels, convertido para unidades de grade)
    
    // Calcula o espaço adicional em unidades de grade baseado no gridSize
    const additionalSpaceX = Math.ceil(paddingGrid / gridSize);
    const additionalSpaceY = Math.ceil(paddingGrid / gridSize);
    
    // Reorganiza cada mesa
    const reorganized = allTables.map(table => {
      // Se a mesa não é da seção atual, mantenha como está
      if ((table.section || 'main') !== section) {
        return table;
      }
      
      // Encontre o índice da mesa na lista ordenada
      const index = sectionTables.findIndex(t => t._id === table._id);
      if (index === -1) return table;
      
      // Calcule a nova posição
      const row = Math.floor(index / gridColumns);
      const column = index % gridColumns;
      
      // Obtenha as dimensões da mesa
      const { width, height } = getTableSizeByCapacity(table.capacity);
      
      // Considere o tamanho de cada mesa ao calcular o posicionamento
      // As coordenadas são ajustadas com base no tamanho da mesa
      // e adicionando espaço extra entre as mesas
      const x = 3 + (column * (spacingX + additionalSpaceX));
      
      // Cálculo vertical precisa considerar a altura da mesa
      // Mesas maiores precisam de mais espaço
      const heightUnits = Math.ceil(height / gridSize);
      const y = 3 + (row * (Math.max(heightUnits, spacingY) + additionalSpaceY));
      
      // Retorne a mesa com nova posição
      return {
        ...table,
        position: { x, y }
      };
    });
    
    return reorganized;
  };
  
  // Botão para reorganizar todas as mesas da seção atual
  const handleReorganizeTables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reorganize tables in memory
      const reorganized = reorganizeTables([...tables], currentSection);
      
      // Extract tables from the current section that need position updates
      const updatedTables = reorganized
        .filter(table => (table.section || 'main') === currentSection);
      
      // Update positions in the database - primeiro conjunto como array para o endpoint em massa
      try {
        // Tenta primeiro usar o endpoint de atualização em massa (mais eficiente)
        await axios.post('/api/tables/update-positions', { tables: updatedTables });
      } catch (err) {
        console.log('Fallback para atualização individual');
        // Fallback: atualiza mesa por mesa se o endpoint em massa falhar
        const updatePromises = updatedTables.map(table => 
          axios.put(`/api/tables/${table._id}`, table)
        );
        await Promise.all(updatePromises);
      }
      
      // Update local state
      setTables(prev => {
        // Substitui apenas as mesas da seção atual, mantendo as outras inalteradas
        return prev.map(table => {
          const updated = reorganized.find(t => t._id === table._id);
          return updated || table;
        });
      });
      
      setSuccess('Mesas reorganizadas com sucesso!');
    } catch (err) {
      console.error('Error reorganizing tables:', err);
      setError('Erro ao reorganizar mesas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para iniciar a seleção de mesas para unir
  const startTableJoining = () => {
    setJoiningTables(true);
    setSelectedTables([]);
  };
  
  // Função para cancelar a seleção de mesas
  const cancelTableJoining = () => {
    setJoiningTables(false);
    setSelectedTables([]);
  };
  
  // Função para alternar a seleção de uma mesa
  const toggleTableSelection = (tableId) => {
    // Verificar se a mesa já está selecionada
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId));
    } else {
      setSelectedTables([...selectedTables, tableId]);
    }
  };
  
  // Função para abrir o diálogo de confirmação de união
  const openJoinConfirmDialog = () => {
    if (selectedTables.length < 2) {
      setError('Selecione pelo menos 2 mesas para unir.');
      return;
    }
    
    setJoinDialogOpen(true);
  };
  
  // Função para unir as mesas
  const joinTables = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Chamar a API para unir as mesas
      const response = await axios.post('/api/tables/join', {
        tableIds: selectedTables
      });
      
      // Atualizar o estado local com a nova mesa principal e mesas virtuais
      const updatedTables = tables.map(table => {
        // Se for a mesa principal
        if (selectedTables[0] === table._id) {
          return response.data.mainTable;
        }
        // Se for uma mesa secundária (agora virtual)
        else if (selectedTables.includes(table._id)) {
          return { ...table, isVirtual: true, parentTable: selectedTables[0] };
        }
        // Qualquer outra mesa permanece inalterada
        return table;
      });
      
      setTables(updatedTables);
      setSuccess('Mesas unidas com sucesso!');
      
      // Resetar o estado de seleção
      setJoiningTables(false);
      setSelectedTables([]);
      setJoinDialogOpen(false);
    } catch (err) {
      console.error('Error joining tables:', err);
      setError(err.response?.data?.message || 'Erro ao unir mesas. Verifique se todas estão disponíveis.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para separar mesas
  const unjoinTables = async (mainTableId) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Chamar a API para separar as mesas
      const response = await axios.post(`/api/tables/unjoin/${mainTableId}`);
      
      // Atualizar o estado local com as mesas atualizadas
      const unjoined = response.data.tables;
      
      // Atualizar o estado local
      setTables(tables.map(table => {
        const updated = unjoined.find(t => t._id === table._id);
        return updated || table;
      }));
      
      setSuccess('Mesas separadas com sucesso!');
    } catch (err) {
      console.error('Error unjoining tables:', err);
      setError(err.response?.data?.message || 'Erro ao separar mesas.');
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

  // Find the size scale factor based on capacity
  const getTableSizeByCapacity = (capacity, isJoined = false) => {
    // Base size for tables with capacity up to 4
    const baseSize = 100;
    
    let width = baseSize;
    let height = baseSize;
    
    if (isJoined) {
      // Mesas unidas crescem horizontalmente em vez de verticalmente
      // Isso evita sobreposição com outras mesas abaixo
      if (capacity > 4 && capacity <= 8) {
        width = baseSize * 2; // Mesa 2x1 horizontal
      } else if (capacity > 8 && capacity <= 12) {
        width = baseSize * 3; // Mesa 3x1 horizontal
      } else if (capacity > 12) {
        // Para mesas muito grandes, use layout 2x2
        width = baseSize * 2;
        height = baseSize * 2;
      }
    } else {
      // Mesas normais (não unidas) seguem o padrão original
      if (capacity > 4 && capacity <= 8) {
        height = baseSize * 2; // Mesa 1x2 vertical
      } else if (capacity > 8) {
        height = baseSize * 3; // Mesa 1x3 vertical
      }
    }
    
    return { width, height };
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
          <Grid item xs={12} md={7}>
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
          
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<DragIndicatorIcon />}
                onClick={handleReorganizeTables}
                size="medium"
                color="primary"
              >
                Reorganizar Mesas
              </Button>
              {joiningTables ? (
                <>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={openJoinConfirmDialog}
                    disabled={selectedTables.length < 2}
                    startIcon={<LinkIcon />}
                  >
                    Unir ({selectedTables.length})
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={cancelTableJoining}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={startTableJoining}
                  startIcon={<LinkIcon />}
                >
                  Juntar Mesas
                </Button>
              )}
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
              transition: 'background-size 0.3s ease',
              p: 2,
              overflow: 'auto'
            }}
          >
            {/* Tables */}
            {sectionTables.map((table) => {
              // Calculate table size based on capacity and joined status
              const { width, height } = getTableSizeByCapacity(table.capacity, table.isJoined);
              
              // Use position from the table data
              const position = table.position || { x: 0, y: 0 };
              
              // Determinar a quantidade de mesas unidas para mostrar no badge
              const joinedCount = table.isJoined && table.joinedWith ? table.joinedWith.length + 1 : 0;
              
              return (
                <Box
                  key={table._id}
                  sx={{
                    position: 'absolute',
                    left: `${position?.x * gridSize}px`,
                    top: `${position?.y * gridSize}px`,
                    width: width,
                    height: height,
                    display: table.isVirtual ? 'none' : 'flex', // Esconde mesas virtuais, mas mantém o status sincronizado
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '8px',
                    backgroundColor: getTableStatusClass(table.status),
                    color: '#fff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    transition: 'all 0.3s ease',
                    border: selectedTables.includes(table._id) 
                      ? '3px solid #f50057' 
                      : table.isJoined 
                        ? '3px solid #3f51b5' 
                        : '2px solid rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    cursor: joiningTables && !table.isJoined && !table.isVirtual && table.status === 'available'
                      ? 'pointer' 
                      : 'default',
                    opacity: joiningTables && (table.isJoined || table.isVirtual || table.status !== 'available') 
                      ? 0.6 
                      : 1,
                    zIndex: selectedTables.includes(table._id) ? 10 : 1,
                    // Efeitos visuais para mesas unidas
                    ...(table.isJoined && {
                      backgroundImage: 
                        'linear-gradient(90deg, rgba(63,81,181,0.1) 50%, rgba(63,81,181,0.2) 50%)',
                      backgroundSize: '20px 100%',
                      animation: `${waveAnimation} 20s linear infinite, ${pulseBorder} 2s infinite`,
                      boxShadow: '0 0 15px rgba(63,81,181,0.5)'
                    }),
                    ...(joiningTables && !table.isJoined && !table.isVirtual && table.status === 'available' && {
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
                      }
                    }),
                    '&::before': table.isJoined ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '6px',
                      border: '2px dashed rgba(255,255,255,0.4)',
                      pointerEvents: 'none'
                    } : {}
                  }}
                  onClick={() => joiningTables && !table.isJoined && !table.isVirtual && table.status === 'available'
                    ? toggleTableSelection(table._id)
                    : null
                  }
                >
                  {/* Ícones de conexão nas bordas para mesas unidas (visual de expandido) */}
                  {table.isJoined && table.joinedWith && table.joinedWith.length > 0 && (
                    <>
                      {/* Indicadores de conexão nas bordas */}
                      <Box sx={{
                        position: 'absolute',
                        top: -5,
                        left: width / 2 - 8,
                        width: 16,
                        height: 10,
                        bgcolor: 'primary.main',
                        borderRadius: '5px 5px 0 0'
                      }} />
                      <Box sx={{
                        position: 'absolute',
                        bottom: -5,
                        left: width / 2 - 8,
                        width: 16,
                        height: 10,
                        bgcolor: 'primary.main',
                        borderRadius: '0 0 5px 5px'
                      }} />
                      <Box sx={{
                        position: 'absolute',
                        left: -5,
                        top: height / 2 - 8,
                        width: 10,
                        height: 16,
                        bgcolor: 'primary.main',
                        borderRadius: '5px 0 0 5px'
                      }} />
                      <Box sx={{
                        position: 'absolute',
                        right: -5,
                        top: height / 2 - 8,
                        width: 10,
                        height: 16,
                        bgcolor: 'primary.main',
                        borderRadius: '0 5px 5px 0'
                      }} />
                    </>
                  )}
                  
                  {/* Indicador de mesas unidas */}
                  {table.isJoined && (
                    <Badge
                      badgeContent={joinedCount}
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transform: 'translate(-30%, -30%)',
                        '& .MuiBadge-badge': {
                          fontSize: '0.8rem',
                          height: 22,
                          minWidth: 22
                        }
                      }}
                    >
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bgcolor: 'primary.main',
                        color: 'white',
                        py: 0.5,
                        px: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        width: '100%'
                      }}>
                        <LinkIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Mesa Unida
                        </Typography>
                      </Box>
                    </Badge>
                  )}
                  
                  {/* Indicação de Pessoas */}
                  <Box sx={{
                    position: 'absolute',
                    top: table.isJoined ? 30 : 5,
                    right: 5,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    px: 1,
                    py: 0.2
                  }}>
                    <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" fontWeight="bold">
                      {table.capacity}
                    </Typography>
                  </Box>
                  
                  {/* Número da mesa */}
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold',
                      mt: table.isJoined ? 3 : 0
                    }}
                  >
                    Mesa {table.tableNumber}
                  </Typography>
                  
                  {/* Exibir mesas unidas se houver */}
                  {table.isJoined && table.joinedWith && table.joinedWith.length > 0 && (
                    <Box sx={{ 
                      mt: 1, 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1, 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      maxWidth: '90%'
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                        Com: {table.joinedWith.map(t => 
                          typeof t === 'object' ? t.tableNumber : '?'
                        ).join(', ')}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Botão para desfazer união (mostrado apenas na versão admin) */}
                  {table.isJoined && !joiningTables && (
                    <Tooltip title="Separar Mesas">
                      <IconButton 
                        size="small" 
                        sx={{ 
                          position: 'absolute', 
                          bottom: 5, 
                          right: 5,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.3)',
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          unjoinTables(table._id);
                        }}
                      >
                        <LinkOffIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {/* Action buttons */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 5, 
                    left: 5,
                    display: 'flex',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: 0.5,
                    boxShadow: 2
                  }}>
                    <IconButton 
                      size="small"
                      color="primary"
                      sx={{ mr: 0.5 }}
                      onClick={() => handleEditTable(table)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, table })}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
            <Typography variant="body2">
              Disponível
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'warning.main', 
              borderRadius: 1,
              mr: 1 
            }} />
            <Typography variant="body2">
              Ocupada
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'info.main', 
              borderRadius: 1,
              mr: 1 
            }} />
            <Typography variant="body2">
              Reservada
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'primary.main',
              backgroundImage: 'linear-gradient(90deg, rgba(63,81,181,0.7) 50%, rgba(63,81,181,0.9) 50%)',
              backgroundSize: '6px 100%',
              borderRadius: 1,
              mr: 1, 
              border: '1px solid rgba(63,81,181,0.5)'
            }} />
            <Typography variant="body2">
              Mesa Unida
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
      
      {/* Join Tables Confirmation Dialog */}
      <Dialog 
        open={joinDialogOpen} 
        onClose={() => setJoinDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24
          }
        }}
      >
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'white',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <LinkIcon />
          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
            Unir Mesas
          </Typography>
        </Box>
        
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" paragraph>
            Você está prestes a unir <strong>{selectedTables.length}</strong> mesas. Isso criará uma única mesa com capacidade ampliada.
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.light', 
            borderRadius: 2, 
            my: 2,
            color: 'primary.dark'
          }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon fontSize="small" /> Detalhes da união:
            </Typography>
            
            <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
              <Box component="li">
                Mesas selecionadas: {selectedTables.map(tableId => {
                  const table = tables.find(t => t._id === tableId);
                  return table ? `#${table.tableNumber}` : '';
                }).filter(Boolean).join(', ')}
              </Box>
              <Box component="li">
                Capacidade total: {selectedTables.reduce((acc, tableId) => {
                  const table = tables.find(t => t._id === tableId);
                  return acc + (table ? table.capacity : 0);
                }, 0)} pessoas
              </Box>
              <Box component="li">
                Mesa principal: {(() => {
                  const mainTable = tables.find(t => t._id === selectedTables[0]);
                  return mainTable ? `#${mainTable.tableNumber}` : 'N/A';
                })()}
              </Box>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Após unir as mesas, elas funcionarão como uma única entidade. Você pode separar as mesas a qualquer momento usando o botão nas configurações da mesa.
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pb: 3 }}>
          <Button 
            onClick={() => setJoinDialogOpen(false)} 
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={joinTables}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
            sx={{ borderRadius: 2 }}
          >
            Confirmar União
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default TablesLayout;

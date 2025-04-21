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
  const { socket } = useSocket();
  const { user } = useAuth();

  // Determina o tamanho relativo da mesa com base na capacidade
  const getTableSizeBasedOnCapacity = (capacity) => {
    // Tamanhos base para mesas de acordo com a capacidade
    if (capacity <= 2) return 0.8; // Mesa pequena (80% do tamanho padrão)
    if (capacity <= 4) return 1.0; // Mesa padrão
    if (capacity <= 8) return 1.3; // Mesa média (30% maior)
    return 1.6; // Mesa grande (60% maior)
  };

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
      const sectionTables = groupedBySection[section];
      
      // Separar mesas principais, secundárias e normais
      const mainTables = sectionTables.filter(t => t.isJoined && !t.isVirtual);
      const secondaryTables = sectionTables.filter(t => t.isVirtual || (t.parentTable && t.parentTable !== null));
      const normalTables = sectionTables.filter(t => !t.isJoined && !t.isVirtual && !t.parentTable);
      
      // Primeiro organizar as mesas principais e suas secundárias
      const processedTableIds = new Set();
      let tableIndex = 0;
      
      // Processar primeiro as mesas principais com suas secundárias
      mainTables.forEach(mainTable => {
        // Verificar se já foi processada
        if (processedTableIds.has(mainTable._id.toString())) return;
        
        // Marcar como processada
        processedTableIds.add(mainTable._id.toString());
        
        // Encontrar todas as mesas secundárias relacionadas
        const relatedTables = secondaryTables.filter(t => {
          // Pode estar na lista joinedWith ou ter parentTable apontando para esta mesa
          return (mainTable.joinedWith && mainTable.joinedWith.some(id => 
            id.toString() === t._id.toString() || 
            (typeof id === 'object' && id._id && id._id.toString() === t._id.toString())
          )) || 
          (t.parentTable && 
           (t.parentTable.toString() === mainTable._id.toString() || 
            (typeof t.parentTable === 'object' && t.parentTable._id && 
             t.parentTable._id.toString() === mainTable._id.toString())
           )
          );
        });
        
        // Configurações de grade
        const row = Math.floor(tableIndex / 3); // 3 grupos de mesas por linha
        const column = tableIndex % 3;
        const spacingX = 8; // Espaçamento horizontal maior para grupos
        const spacingY = 8; // Espaçamento vertical maior para grupos
        
        // Posicionar a mesa principal
        const mainTableSize = getTableSizeBasedOnCapacity(mainTable.capacity) * 1.1; // 10% maior
        const baseX = 3 + (column * spacingX);
        const baseY = 3 + (row * spacingY);
        
        mainTable.position = { x: baseX, y: baseY };
        mainTable._size = mainTableSize;
        mainTable._isMain = true; // Marcar como mesa principal
        reorganized.push(mainTable);
        
        // Posicionar as mesas secundárias ao redor da principal
        relatedTables.forEach((relatedTable, idx) => {
          processedTableIds.add(relatedTable._id.toString());
          
          // Decidir onde posicionar a mesa secundária em relação à principal
          // Usamos offsets para posicionar em volta da mesa principal
          const positions = [
            { x: 0, y: -1.2 },  // Acima
            { x: 1.2, y: 0 },   // Direita
            { x: 0, y: 1.2 },   // Abaixo
            { x: -1.2, y: 0 },  // Esquerda
            { x: 1, y: -1 },    // Diagonal superior direita
            { x: 1, y: 1 },     // Diagonal inferior direita
            { x: -1, y: 1 },    // Diagonal inferior esquerda
            { x: -1, y: -1 },   // Diagonal superior esquerda
          ];
          
          const pos = positions[idx % positions.length];
          
          // Calcular tamanho menor para mesa secundária 
          const relatedTableSize = getTableSizeBasedOnCapacity(relatedTable.capacity) * 0.9; // 10% menor
          
          relatedTable.position = { 
            x: baseX + pos.x, 
            y: baseY + pos.y 
          };
          relatedTable._size = relatedTableSize;
          relatedTable._isSecondary = true; // Marcar como mesa secundária
          relatedTable._mainTableId = mainTable._id.toString();
          
          reorganized.push(relatedTable);
        });
        
        tableIndex++;
      });
      
      // Organizar as mesas normais (não relacionadas)
      normalTables.forEach(table => {
        if (processedTableIds.has(table._id.toString())) return;
        
        // Configurações de grade para mesas normais
        const row = Math.floor(tableIndex / 3);
        const column = tableIndex % 3;
        const spacingX = 8;
        const spacingY = 8;
        
        // Calcular tamanho e posição
        const tableSize = getTableSizeBasedOnCapacity(table.capacity);
        const x = 3 + (column * spacingX);
        const y = 3 + (row * spacingY);
        
        table.position = { x, y };
        table._size = tableSize;
        
        reorganized.push(table);
        tableIndex++;
      });
    });
    
    return reorganized;
  };
  
  // Fetch tables data
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tables');
        
        // Verifica se as mesas têm posições definidas, caso contrário reorganiza automaticamente
        const fetchedTables = response.data;
        
        // Processar as mesas para identificar relações entre elas
        const processedTables = processTables(fetchedTables);
        
        // Organiza automaticamente se necessário
        const needsReorganization = processedTables.some(table => 
          !table.position || table.position.x === undefined || table.position.y === undefined
        );
        
        // Organiza automaticamente se necessário
        const organizedTables = needsReorganization 
          ? reorganizeTables(processedTables) 
          : processedTables;
        
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
    
    // Configurar socket listener para atualizações em tempo real
    if (socket) {
      // Ouvir por atualizações de mesa
      socket.on('tableUpdated', (data) => {
        if (data && data.tableId) {
          console.log('Recebida atualização da mesa via socket:', data);
          // Atualizar a mesa local
          setTables(prevTables => 
            prevTables.map(table => 
              table._id === data.tableId ? { ...table, status: data.status } : table
            )
          );
        }
      });
      
      socket.on('tableStatusChanged', (data) => {
        if (data && data.tableId) {
          console.log('Status da mesa alterado via socket:', data);
          // Atualizar a mesa local
          setTables(prevTables => 
            prevTables.map(table => 
              table._id === data.tableId ? { ...table, status: data.status } : table
            )
          );
        }
      });
      
      // Retornar cleanup function
      return () => {
        socket.off('tableUpdated');
        socket.off('tableStatusChanged');
      };
    }
    
    // Set up polling for real-time updates (as a fallback to socket updates)
    const interval = setInterval(fetchTables, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [socket, navigate, user]); // Dependências adequadas
  
  // Pré-processamento das mesas para identificar relações
  const processTables = (tables) => {
    const tablesMap = new Map();
    
    // Primeiro passo: mapear todas as mesas por ID para rápido acesso
    tables.forEach(table => {
      // Garantir que a capacidade seja um número
      if (table.capacity && typeof table.capacity !== 'number') {
        console.log(`Convertendo capacidade da mesa ${table.tableNumber} de ${typeof table.capacity} para number`);
        table.capacity = Number(table.capacity);
      }
      tablesMap.set(table._id.toString(), { ...table });
    });
    
    // Segundo passo: identificar relações entre mesas
    const processedTables = tables.map(table => {
      const tableObj = { ...table };
      
      // Verificar se esta mesa é uma mesa principal (tem mesas unidas)
      if (table.isJoined && table.joinedWith && table.joinedWith.length > 0) {
        tableObj._isMain = true;
        
        // Marcar quais mesas são secundárias desta mesa principal
        const secondaryTableIds = table.joinedWith.map(id => 
          typeof id === 'object' ? id._id.toString() : id.toString()
        );
        
        tableObj._secondaryTables = secondaryTableIds;
        tableObj._isExpanded = true; // Mesa principal expandida para incluir secundárias
        
        console.log(`Mesa ${table.tableNumber} identificada como PRINCIPAL com ${secondaryTableIds.length} mesas secundárias:`, secondaryTableIds);
      }
      
      // Verificar se esta mesa é uma mesa secundária (parte de uma mesa unida)
      if (table.isVirtual && table.parentTable) {
        const parentId = typeof table.parentTable === 'object' 
          ? table.parentTable._id.toString() 
          : table.parentTable.toString();
          
        tableObj._isSecondary = true;
        tableObj._mainTableId = parentId;
        tableObj._shouldHide = true; // Ocultar mesa secundária, será representada pela principal
        
        console.log(`Mesa ${table.tableNumber} identificada como SECUNDÁRIA da mesa principal ${parentId}`);
      }
      
      return tableObj;
    });
    
    // Terceiro passo: definir propriedades adicionais para mesas principais
    return processedTables.map(table => {
      if (table._isMain) {
        // Encontrar todas as mesas secundárias
        const secondaryTables = processedTables.filter(t => 
          t._isSecondary && table._secondaryTables.includes(t._id.toString())
        );
        
        if (secondaryTables.length > 0) {
          // Depuração detalhada para verificar capacidades
          console.log(`CAPACIDADE - Mesa principal ${table.tableNumber}: ${table.capacity}`);
          
          // Na interface de administrador, não precisamos somar capacidades
          // A capacidade da mesa principal já inclui a capacidade das mesas secundárias
          // Apenas usar a capacidade da mesa principal
          table._totalCapacity = Number(table.capacity) || 0;
          
          // Armazenar referência às mesas secundárias
          table._secondaryTableObjects = secondaryTables;
          
          console.log(`Mesa principal ${table.tableNumber} tem capacidade total: ${table._totalCapacity} (já inclui mesas secundárias)`);
        }
      }
      
      return table;
    });
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
  const baseSize = 70; // Base size in pixels

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
      {/* Desenhar linhas de conexão entre mesas principais e secundárias */}
      {tables.filter(t => t._isSecondary).map(secondaryTable => {
        const mainTable = tables.find(t => t._id.toString() === secondaryTable._mainTableId);
        if (!mainTable) return null;
        
        // Calcular posições centrais das mesas para desenhar as linhas
        const mainX = (mainTable.position.x * gridSize) + (Math.round(baseSize * mainTable._size) / 2);
        const mainY = (mainTable.position.y * gridSize) + (Math.round(baseSize * mainTable._size) / 2); 
        const secondaryX = (secondaryTable.position.x * gridSize) + (Math.round(baseSize * secondaryTable._size) / 2);
        const secondaryY = (secondaryTable.position.y * gridSize) + (Math.round(baseSize * secondaryTable._size) / 2);
        
        // Definir a cor da linha com base no status
        const lineColor = mainTable.status === 'occupied' ? 'rgba(255, 193, 7, 0.6)' : 'rgba(25, 118, 210, 0.6)';
        
        // Calcular distância entre os centros
        const dx = secondaryX - mainX;
        const dy = secondaryY - mainY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calcular o ângulo da linha em graus
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        return (
          <Box
            key={`line-${mainTable._id}-${secondaryTable._id}`}
            sx={{
              position: 'absolute',
              left: mainX,
              top: mainY,
              width: distance,
              height: 2,
              backgroundColor: lineColor,
              borderTop: `2px dashed ${lineColor}`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 0',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        );
      })}
      
      {tables.map(table => {
        // Pular mesas marcadas para ocultar (secundárias)
        if (table._shouldHide) return null;
        
        // Calculate size based on capacity
        const sizeMultiplier = table._size || getTableSizeBasedOnCapacity(table.capacity);
        const tableSize = Math.round(baseSize * sizeMultiplier);
        
        // Determine visual style based on table type
        const isMainJoined = table._isMain;
        
        // Para mesas principais, verificar suas mesas secundárias
        let secondaryTables = [];
        if (isMainJoined && table._secondaryTableObjects) {
          secondaryTables = table._secondaryTableObjects;
        }
        
        // Calcular o tamanho total para mesas unidas
        let totalWidth = tableSize;
        let totalHeight = tableSize;
        
        // Se for uma mesa principal com mesas secundárias, ajustar o tamanho
        if (isMainJoined && secondaryTables.length > 0) {
          // Aumentar o tamanho com base no número de mesas secundárias
          if (secondaryTables.length === 1) {
            totalWidth = tableSize * 1.8; // Mesa 1.8x mais larga
          } else if (secondaryTables.length >= 2) {
            totalWidth = tableSize * 2.2; // Mesa 2.2x mais larga
            
            if (secondaryTables.length >= 4) {
              totalHeight = tableSize * 1.5; // Mesa também mais alta para 4+ mesas secundárias
            }
          }
          
          console.log(`Mesa ${table.tableNumber} redimensionada: ${totalWidth}x${totalHeight}`);
        }
        
        return (
          <Tooltip
            key={table._id}
            title={
              <Box>
                <Typography variant="subtitle2">
                  Mesa {table.tableNumber}
                  {isMainJoined && secondaryTables.length > 0 && 
                    ` (Mesa Principal unida com ${secondaryTables.length} mesa${secondaryTables.length !== 1 ? 's' : ''})`
                  }
                </Typography>
                <Typography variant="body2">
                  Status: {table.status === 'available' ? 'Disponível' : table.status === 'occupied' ? 'Ocupada' : 'Reservada'}
                </Typography>
                <Typography variant="body2">
                  Capacidade: {isMainJoined && table._totalCapacity ? `${table._totalCapacity}` : `${table.capacity}`} pessoas
                  {isMainJoined && secondaryTables.length > 0 && (
                    ` (inclui ${secondaryTables.length} mesa${secondaryTables.length !== 1 ? 's' : ''} adicional${secondaryTables.length !== 1 ? 'is' : ''})`
                  )}
                </Typography>
                {isMainJoined && secondaryTables.length > 0 && (
                  <Box>
                    <Typography variant="body2">
                      Mesas unidas: {
                        [table.tableNumber, ...secondaryTables.map(t => t.tableNumber)].join(', ')
                      }
                    </Typography>
                  </Box>
                )}
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
                width: isMainJoined && secondaryTables.length > 0 ? totalWidth : tableSize,
                height: isMainJoined && secondaryTables.length > 0 ? totalHeight : tableSize,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: isMainJoined ? '8px' : '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6,
                },
                border: isMainJoined && secondaryTables.length > 0
                  ? `4px solid ${table.status === 'occupied' 
                      ? 'rgba(255, 193, 7, 0.8)' 
                      : 'rgba(25, 118, 210, 0.8)'}`
                  : isMainJoined 
                    ? '3px solid rgba(25, 118, 210, 0.7)' 
                    : '2px solid rgba(255,255,255,0.7)',
                boxShadow: isMainJoined ? '0 0 10px rgba(25, 118, 210, 0.5)' : undefined,
                // Adicionar estilo especial para mesas unidas
                backgroundImage: isMainJoined && secondaryTables.length > 0 
                  ? table.status === 'occupied'
                    ? 'linear-gradient(45deg, rgba(255, 193, 7, 0.3) 25%, rgba(255, 193, 7, 0.4) 25%, rgba(255, 193, 7, 0.4) 50%, rgba(255, 193, 7, 0.3) 50%, rgba(255, 193, 7, 0.3) 75%, rgba(255, 193, 7, 0.4) 75%, rgba(255, 193, 7, 0.4) 100%)'
                    : 'linear-gradient(45deg, rgba(25, 118, 210, 0.1) 25%, rgba(25, 118, 210, 0.2) 25%, rgba(25, 118, 210, 0.2) 50%, rgba(25, 118, 210, 0.1) 50%, rgba(25, 118, 210, 0.1) 75%, rgba(25, 118, 210, 0.2) 75%, rgba(25, 118, 210, 0.2) 100%)'
                  : undefined,
                backgroundSize: '20px 20px',
                // Adicionar animação pulsante para mesas principais
                animation: isMainJoined && secondaryTables.length > 0 
                  ? 'pulse 2s infinite' 
                  : 'none',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.4)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)' },
                },
                zIndex: 2,
              }}
              onClick={() => handleTableClick(table)}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: isMainJoined && secondaryTables.length > 0 ? '1.3rem' : 'inherit',
                }}
              >
                {table.tableNumber}
                {isMainJoined && secondaryTables.length > 0 && (
                  <span style={{ 
                    fontSize: '0.7em', 
                    marginLeft: '4px', 
                    opacity: 0.7 
                  }}>
                    (+{secondaryTables.length})
                  </span>
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  {isMainJoined && table._totalCapacity 
                    ? `${table._totalCapacity}`
                    : `${table.capacity}`
                  }
                </Typography>
              </Box>
              
              {/* Mostrar miniaturas das mesas secundárias */}
              {isMainJoined && secondaryTables.length > 0 && (
                <Box sx={{ 
                  display: 'flex', 
                  gap: '4px',
                  mt: 1
                }}>
                  {secondaryTables.slice(0, 3).map((secTable, idx) => (
                    <Box 
                      key={`mini-table-${secTable._id}-${idx}`}
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: 'rgba(255,255,255,0.6)',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {secTable.tableNumber}
                    </Box>
                  ))}
                  {secondaryTables.length > 3 && (
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: 'rgba(255,255,255,0.6)',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        fontSize: '0.7rem'
                      }}
                    >
                      +{secondaryTables.length - 3}
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Indicador de mesa unida */}
              {isMainJoined && secondaryTables.length > 0 && (
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: table.status === 'occupied' ? 'warning.main' : 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    border: '2px solid white',
                    boxShadow: 1,
                  }}
                >
                  {secondaryTables.length}
                </Box>
              )}
              
              {table.status === 'occupied' && table.occupiedAt && (
                <Typography variant="caption" sx={{ 
                  position: 'absolute', 
                  bottom: 4, 
                  right: 4,
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
          <Typography variant="caption">
            Disponível
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            bgcolor: '#FFC107', 
            borderRadius: '50%',
            mr: 0.5 
          }} />
          <Typography variant="caption">
            Ocupada
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            bgcolor: '#FF9800', 
            borderRadius: '50%',
            mr: 0.5 
          }} />
          <Typography variant="caption">
            Reservada
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            border: '2px solid #1976D2',
            borderRadius: '8px',
            mr: 0.5 
          }} />
          <Typography variant="caption">
            Mesa Principal
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TableStatusMap;

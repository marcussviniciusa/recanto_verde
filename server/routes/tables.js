const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/tables
// @desc    Get all tables
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const tables = await Table.find()
      .populate('assignedWaiters', 'name')
      .populate('currentOrder')
      .populate('parentTable')
      .populate('joinedWith');
    
    res.json(tables);
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/tables
// @desc    Create a new table
// @access  Private/Superadmin
router.post('/', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { tableNumber, capacity, position, section } = req.body;
    
    // Check if table already exists
    const tableExists = await Table.findOne({ tableNumber });
    if (tableExists) {
      return res.status(400).json({ message: 'Mesa com este número já existe' });
    }
    
    const table = await Table.create({
      tableNumber,
      capacity,
      position,
      section
    });
    
    res.status(201).json(table);
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/tables/:id
// @desc    Get a table by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('assignedWaiters', 'name')
      .populate({
        path: 'currentOrder',
        populate: {
          path: 'items.menuItem',
          model: 'MenuItem'
        }
      })
      .populate('parentTable')
      .populate('joinedWith');
    
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    res.json(table);
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/tables/:id
// @desc    Update table
// @access  Private/Superadmin
router.put('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    const { tableNumber, capacity, position, section, status, assignedWaiter } = req.body;
    
    // Update fields if provided
    if (tableNumber !== undefined) table.tableNumber = tableNumber;
    if (capacity !== undefined) table.capacity = capacity;
    if (position !== undefined) table.position = position;
    if (section !== undefined) table.section = section;
    
    // Update status and related fields
    if (status !== undefined) {
      table.status = status;
      
      if (status === 'occupied' && table.status !== 'occupied') {
        table.occupiedAt = Date.now();
      } else if (status !== 'occupied') {
        table.occupiedAt = null;
      }
    }
    
    // Atualizar assignedWaiters se um único garçom for fornecido via assignedWaiter
    if (assignedWaiter !== undefined) {
      if (!assignedWaiter) {
        table.assignedWaiters = [];
      } else {
        // Verificar se já existe na lista, caso contrário adicionar
        if (!table.assignedWaiters) {
          table.assignedWaiters = [assignedWaiter];
        } else if (!table.assignedWaiters.includes(assignedWaiter)) {
          table.assignedWaiters = [assignedWaiter]; // Substitui a lista para manter compatibilidade
        }
      }
    }
    
    await table.save();
    
    res.json(table);
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/tables/:id/status
// @desc    Update table status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, assignedWaiter, assignedWaiters, currentOrder } = req.body;
    
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    // Array para armazenar todas as mesas atualizadas para emitir eventos
    const updatedTables = [];
    
    // Update fields if provided
    if (status) {
      table.status = status;
      
      // If table becomes occupied, set occupiedAt timestamp
      if (status === 'occupied' && table.status !== 'occupied') {
        table.occupiedAt = Date.now();
        
        // Se a mesa está sendo ocupada e é uma mesa unida ou virtual,
        // todas as mesas relacionadas também devem ficar ocupadas
        if (table.isJoined && table.joinedWith && table.joinedWith.length > 0) {
          console.log(`Table ${table.tableNumber} is a joined table being occupied, updating related tables`);
          
          // Atualizar todas as mesas secundárias
          for (const relatedTableId of table.joinedWith) {
            const relatedTable = await Table.findById(relatedTableId);
            if (relatedTable) {
              relatedTable.status = 'occupied';
              relatedTable.occupiedAt = Date.now();
              await relatedTable.save();
              console.log(`Updated related table ${relatedTable.tableNumber} to occupied`);
              
              // Adicionar à lista de atualizações para socket
              updatedTables.push({
                tableId: relatedTable._id.toString(),
                tableNumber: relatedTable.tableNumber,
                status: 'occupied'
              });
            }
          }
        } else if (table.isVirtual && table.parentTable) {
          console.log(`Table ${table.tableNumber} is a virtual table being occupied, updating parent table`);
          
          // Atualizar a mesa principal e todas as outras secundárias
          const parentTable = await Table.findById(table.parentTable);
          if (parentTable) {
            // Atualizar a mesa principal
            parentTable.status = 'occupied';
            parentTable.occupiedAt = Date.now();
            await parentTable.save();
            console.log(`Updated parent table ${parentTable.tableNumber} to occupied`);
            
            // Adicionar à lista de atualizações para socket
            updatedTables.push({
              tableId: parentTable._id.toString(),
              tableNumber: parentTable.tableNumber,
              status: 'occupied'
            });
            
            // Atualizar todas as outras mesas secundárias
            if (parentTable.joinedWith && parentTable.joinedWith.length > 0) {
              for (const relatedTableId of parentTable.joinedWith) {
                // Pular a mesa atual
                if (relatedTableId.toString() === req.params.id) continue;
                
                const relatedTable = await Table.findById(relatedTableId);
                if (relatedTable) {
                  relatedTable.status = 'occupied';
                  relatedTable.occupiedAt = Date.now();
                  await relatedTable.save();
                  console.log(`Updated sibling table ${relatedTable.tableNumber} to occupied`);
                  
                  // Adicionar à lista de atualizações para socket
                  updatedTables.push({
                    tableId: relatedTable._id.toString(),
                    tableNumber: relatedTable.tableNumber,
                    status: 'occupied'
                  });
                }
              }
            }
          }
        }
      }
      
      // If table becomes available, clear currentOrder
      if (status === 'available') {
        table.currentOrder = null;
        table.occupiedAt = null;
        
        // Se a mesa está ficando livre e é uma mesa unida ou virtual,
        // todas as mesas relacionadas também devem ficar livres
        if (table.isJoined && table.joinedWith && table.joinedWith.length > 0) {
          console.log(`Table ${table.tableNumber} is a joined table being freed, updating related tables`);
          
          // Atualizar todas as mesas secundárias
          for (const relatedTableId of table.joinedWith) {
            const relatedTable = await Table.findById(relatedTableId);
            if (relatedTable) {
              relatedTable.status = 'available';
              relatedTable.occupiedAt = null;
              relatedTable.currentOrder = null;
              await relatedTable.save();
              console.log(`Updated related table ${relatedTable.tableNumber} to available`);
              
              // Adicionar à lista de atualizações para socket
              updatedTables.push({
                tableId: relatedTable._id.toString(),
                tableNumber: relatedTable.tableNumber,
                status: 'available'
              });
            }
          }
        } else if (table.isVirtual && table.parentTable) {
          console.log(`Table ${table.tableNumber} is a virtual table being freed, updating parent table`);
          
          // Atualizar a mesa principal e todas as outras secundárias
          const parentTable = await Table.findById(table.parentTable);
          if (parentTable) {
            // Atualizar a mesa principal
            parentTable.status = 'available';
            parentTable.occupiedAt = null;
            parentTable.currentOrder = null;
            await parentTable.save();
            console.log(`Updated parent table ${parentTable.tableNumber} to available`);
            
            // Adicionar à lista de atualizações para socket
            updatedTables.push({
              tableId: parentTable._id.toString(),
              tableNumber: parentTable.tableNumber,
              status: 'available'
            });
            
            // Atualizar todas as outras mesas secundárias
            if (parentTable.joinedWith && parentTable.joinedWith.length > 0) {
              for (const relatedTableId of parentTable.joinedWith) {
                // Pular a mesa atual
                if (relatedTableId.toString() === req.params.id) continue;
                
                const relatedTable = await Table.findById(relatedTableId);
                if (relatedTable) {
                  relatedTable.status = 'available';
                  relatedTable.occupiedAt = null;
                  relatedTable.currentOrder = null;
                  await relatedTable.save();
                  console.log(`Updated sibling table ${relatedTable.tableNumber} to available`);
                  
                  // Adicionar à lista de atualizações para socket
                  updatedTables.push({
                    tableId: relatedTable._id.toString(),
                    tableNumber: relatedTable.tableNumber,
                    status: 'available'
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Inicializar array se não existir
    if (!table.assignedWaiters) {
      table.assignedWaiters = [];
    }
    
    // Atualizar assignedWaiters se fornecido
    if (assignedWaiters && Array.isArray(assignedWaiters)) {
      // Para cada garçom no array, adicionar se ainda não estiver na lista
      assignedWaiters.forEach(waiterId => {
        if (!table.assignedWaiters.some(w => w.toString() === waiterId.toString())) {
          table.assignedWaiters.push(waiterId);
        }
      });
    }
    // Compatibilidade para trás - adicionar um único garçom
    else if (assignedWaiter) {
      if (!table.assignedWaiters.some(w => w.toString() === assignedWaiter.toString())) {
        table.assignedWaiters.push(assignedWaiter);
      }
    }
    
    if (currentOrder) {
      table.currentOrder = currentOrder;
    }
    
    await table.save();
    
    // Populate related fields before returning
    const updatedTable = await Table.findById(req.params.id)
      .populate('assignedWaiters', 'name')
      .populate('currentOrder')
      .populate('parentTable')
      .populate('joinedWith');
      
    // Emitir eventos para todas as mesas atualizadas
    if (updatedTables.length > 0) {
      // Acessar o objeto io do socket
      const io = req.app.get('io');
      if (io) {
        // Emitir evento para cada mesa atualizada
        for (const tableUpdate of updatedTables) {
          io.to('waiter').emit('tableStatusChanged', tableUpdate);
          io.to('superadmin').emit('tableStatusChanged', tableUpdate);
          console.log(`Emitted socket event for table ${tableUpdate.tableNumber}`);
        }
      }
    }
      
    res.json(updatedTable);
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   DELETE /api/tables/:id
// @desc    Delete a table
// @access  Private/Superadmin
router.delete('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    // Check if table has current order
    if (table.currentOrder) {
      return res.status(400).json({ 
        message: 'Não é possível remover uma mesa com pedido ativo' 
      });
    }
    
    await Table.deleteOne({ _id: req.params.id });
    res.json({ message: 'Mesa removida com sucesso' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/tables/section/:section
// @desc    Get tables by section
// @access  Private
router.get('/section/:section', protect, async (req, res) => {
  try {
    const tables = await Table.find({ section: req.params.section })
      .populate('assignedWaiters', 'name')
      .populate('currentOrder')
      .populate('parentTable')
      .populate('joinedWith');
      
    res.json(tables);
  } catch (error) {
    console.error('Get tables by section error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/tables/status/:status
// @desc    Get tables by status
// @access  Private
router.get('/status/:status', protect, async (req, res) => {
  try {
    const tables = await Table.find({ status: req.params.status })
      .populate('assignedWaiters', 'name')
      .populate('currentOrder')
      .populate('parentTable')
      .populate('joinedWith');
      
    res.json(tables);
  } catch (error) {
    console.error('Get tables by status error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/tables/update-positions
// @desc    Update positions of multiple tables
// @access  Private
router.post('/update-positions', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { tables } = req.body;
    
    if (!tables || !Array.isArray(tables)) {
      return res.status(400).json({ message: 'Dados inválidos. Lista de mesas é obrigatória.' });
    }
    
    // Array para armazenar as operações de atualização
    const bulkOps = tables.map(table => ({
      updateOne: {
        filter: { _id: table._id },
        // Atualizamos apenas a posição para garantir segurança
        update: { 
          $set: { 
            position: {
              x: table.position.x,
              y: table.position.y
            }
          } 
        }
      }
    }));
    
    // Executa todas as atualizações em uma única operação
    if (bulkOps.length > 0) {
      await Table.bulkWrite(bulkOps);
    }
    
    res.json({ success: true, count: tables.length });
  } catch (error) {
    console.error('Update positions error:', error);
    res.status(500).json({ message: 'Erro ao atualizar posições das mesas' });
  }
});

// @route   POST /api/tables/join
// @desc    Join multiple tables together
// @access  Private (both superadmin and waiters)
router.post('/join', protect, async (req, res) => {
  try {
    console.log('Join Tables Request Body:', req.body);
    const { tableIds } = req.body;
    console.log('Join Tables Request - tableIds:', tableIds);
    
    // Validação adicional dos tableIds
    if (!tableIds) {
      console.log('Join Tables Error - tableIds missing');
      return res.status(400).json({ message: 'tableIds é obrigatório' });
    }
    
    if (!Array.isArray(tableIds)) {
      console.log('Join Tables Error - tableIds is not an array:', typeof tableIds);
      return res.status(400).json({ message: 'tableIds deve ser um array' });
    }
    
    // Garantir que todos os IDs são strings válidas de MongoDB
    const sanitizedTableIds = tableIds.filter(id => {
      const isValid = id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/);
      if (!isValid) {
        console.log('Join Tables Warning - Invalid ID format:', id);
      }
      return isValid;
    });
    
    console.log('Join Tables - Sanitized tableIds:', sanitizedTableIds);
    
    if (sanitizedTableIds.length < 2) {
      console.log('Join Tables Error - Not enough valid IDs:', sanitizedTableIds);
      return res.status(400).json({ message: 'É necessário fornecer pelo menos 2 IDs de mesas válidos para unir' });
    }
    
    // Verificar se todas as mesas existem
    const tables = await Table.find({ _id: { $in: sanitizedTableIds } })
      .populate('assignedWaiters', 'name');
    
    console.log('Join Tables - Found tables:', tables.length, 'of', sanitizedTableIds.length);
    
    if (tables.length !== sanitizedTableIds.length) {
      const foundIds = tables.map(t => t._id.toString());
      const missingIds = sanitizedTableIds.filter(id => !foundIds.includes(id));
      console.log('Join Tables Error - Not all tables found:', 
        { found: foundIds, missing: missingIds });
      return res.status(400).json({ message: 'Uma ou mais mesas não foram encontradas' });
    }
    
    // Verificar se as mesas estão disponíveis
    const unavailableTables = tables.filter(table => table.status !== 'available');
    console.log('Join Tables - Unavailable tables:', unavailableTables.map(t => t.tableNumber));
    
    if (unavailableTables.length > 0) {
      return res.status(400).json({ 
        message: `As seguintes mesas não estão disponíveis: ${unavailableTables.map(t => t.tableNumber).join(', ')}` 
      });
    }
    
    // Verificamos se as mesas já estão unidas, mas não bloqueamos mais, apenas logamos
    const alreadyJoinedTables = tables.filter(table => table.isJoined || table.isVirtual);
    console.log('Join Tables - Already joined tables:', alreadyJoinedTables.map(t => t.tableNumber));
    
    // Obter as mesas virtuais que precisam ser "desmarquinadas"
    const virtualTables = tables.filter(table => table.isVirtual);
    for (const virtualTable of virtualTables) {
      console.log(`Resetting virtual table ${virtualTable.tableNumber} (${virtualTable._id})`);
      virtualTable.isVirtual = false;
      virtualTable.parentTable = null;
      await virtualTable.save();
    }
    
    // Para mesas que já são "principais" (tem isJoined=true), precisamos desvinculá-las primeiro
    const mainJoinedTables = tables.filter(table => table.isJoined);
    for (const joinedTable of mainJoinedTables) {
      console.log(`Removing existing join from table ${joinedTable.tableNumber} (${joinedTable._id})`);
      // Buscar e restaurar todas as mesas virtuais que pertencem a esta mesa
      if (joinedTable.joinedWith && joinedTable.joinedWith.length > 0) {
        const childTables = await Table.find({ _id: { $in: joinedTable.joinedWith } });
        for (const childTable of childTables) {
          console.log(`  - Resetting child table ${childTable.tableNumber} (${childTable._id})`);
          childTable.isVirtual = false;
          childTable.parentTable = null;
          await childTable.save();
        }
      }
      
      // Restaurar a mesa principal
      joinedTable.isJoined = false;
      joinedTable.joinedWith = [];
      // Restauramos a capacidade original se soubermos
      if (joinedTable.originalCapacity) {
        joinedTable.capacity = joinedTable.originalCapacity;
      }
      await joinedTable.save();
    }
    
    // Verificar se as mesas estão na mesma seção
    const sections = [...new Set(tables.map(table => table.section))];
    console.log('Join Tables - Sections:', sections);
    
    if (sections.length > 1) {
      return res.status(400).json({ message: 'Todas as mesas devem estar na mesma seção' });
    }
    
    // Criar uma nova capacidade agregada
    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
    
    // Usar a primeira mesa como a principal
    const mainTable = tables[0];
    
    // Log do que vamos fazer
    console.log('Join Tables - Main table:', {
      tableNumber: mainTable.tableNumber,
      id: mainTable._id.toString()
    });
    console.log('Join Tables - Secondary tables:', tables.slice(1).map(t => ({
      tableNumber: t.tableNumber, 
      id: t._id.toString()
    })));
    
    // Definir uma posição adequada para a mesa unida
    // Se a mesa principal estiver muito próxima do limite inferior do grid,
    // podemos ajustar sua posição para cima para garantir que não sobreponha outras mesas
    const adjustPositionIfNeeded = (table, newCapacity) => {
      // Se não tiver posição definida, não fazemos nada
      if (!table.position) return;
      
      // Estimativa da altura necessária com base na capacidade
      let requiredSpace = 1; // Espaço padrão
      
      if (newCapacity > 4 && newCapacity <= 8) {
        requiredSpace = 2;
      } else if (newCapacity > 8 && newCapacity <= 12) {
        requiredSpace = 2; // Horizontal, então mantemos altura 2
      } else if (newCapacity > 12) {
        requiredSpace = 2; // Formato 2x2
      }
      
      // Verificar se há espaço suficiente
      // Espaçamento entre mesas tipicamente é de 4 unidades
      const spacingY = 4;
      
      // Verificar quantas mesas caberiam abaixo da posição atual
      const spacesBelow = Math.floor((table.position.y + requiredSpace) / spacingY);
      
      // Se a mesa estiver muito próxima do limite inferior, ajustamos para cima
      if (spacesBelow > 0 && table.position.y % spacingY > spacingY - requiredSpace) {
        // Ajustar a posição para o início da linha do grid
        table.position.y = spacesBelow * spacingY;
        return true;
      }
      
      return false;
    };
    
    try {
      // Guardar a capacidade original da mesa principal antes de alterar
      if (!mainTable.originalCapacity) {
        mainTable.originalCapacity = mainTable.capacity;
      }
      
      // Ajustar a posição da mesa principal se necessário
      const positionAdjusted = adjustPositionIfNeeded(mainTable, totalCapacity);
      if (positionAdjusted) {
        console.log(`Join Tables - Adjusted main table position to prevent overlap: x=${mainTable.position.x}, y=${mainTable.position.y}`);
      }
      
      // Atualizar a mesa principal
      mainTable.isJoined = true;
      mainTable.joinedWith = tables.slice(1).map(table => table._id);
      mainTable.capacity = totalCapacity;
      await mainTable.save();
      console.log('Join Tables - Main table updated successfully');
      
      // Atualizar as outras mesas como virtuais
      for (let i = 1; i < tables.length; i++) {
        tables[i].isVirtual = true;
        tables[i].parentTable = mainTable._id;
        await tables[i].save();
        console.log(`Join Tables - Secondary table ${tables[i].tableNumber} updated`);
      }
      
      const updatedMainTable = await Table.findById(mainTable._id)
        .populate('joinedWith')
        .populate('assignedWaiters', 'name');
      
      console.log('Join Tables - Success. Tables joined:', {
        mainTable: updatedMainTable.tableNumber,
        joinedWith: updatedMainTable.joinedWith.map(t => 
          typeof t === 'object' ? t.tableNumber : 'unknown'
        )
      });
      
      res.status(200).json({
        message: 'Mesas unidas com sucesso',
        mainTable: updatedMainTable
      });
    } catch (saveError) {
      console.error('Join Tables - Error saving table changes:', saveError);
      res.status(500).json({ message: 'Erro ao salvar as alterações nas mesas' });
    }
  } catch (error) {
    console.error('Join tables error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/tables/unjoin/:id
// @desc    Unjoin tables that were previously joined
// @access  Private (both superadmin and waiters)
router.post('/unjoin/:id', protect, async (req, res) => {
  try {
    const mainTableId = req.params.id;
    
    // Encontrar a mesa principal
    const mainTable = await Table.findById(mainTableId);
    if (!mainTable) {
      return res.status(404).json({ message: 'Mesa principal não encontrada' });
    }
    
    // Verificar se a mesa está realmente unida
    if (!mainTable.isJoined || !mainTable.joinedWith || mainTable.joinedWith.length === 0) {
      return res.status(400).json({ message: 'Esta mesa não está unida a nenhuma outra' });
    }
    
    // Verificar se a mesa está ocupada
    if (mainTable.status !== 'available') {
      return res.status(400).json({ message: 'Não é possível separar mesas ocupadas ou reservadas' });
    }
    
    // Encontrar todas as mesas virtuais
    const virtualTables = await Table.find({ parentTable: mainTableId });
    
    // Restaurar a capacidade original da mesa principal
    const originalCapacity = mainTable.capacity - virtualTables.reduce((sum, table) => sum + table.capacity, 0);
    mainTable.capacity = Math.max(originalCapacity, 2); // Garantir uma capacidade mínima de 2
    mainTable.isJoined = false;
    mainTable.joinedWith = [];
    await mainTable.save();
    
    // Restaurar as mesas virtuais
    for (const table of virtualTables) {
      table.isVirtual = false;
      table.parentTable = null;
      await table.save();
    }
    
    res.status(200).json({
      message: 'Mesas separadas com sucesso',
      tables: [mainTable, ...virtualTables]
    });
  } catch (error) {
    console.error('Unjoin tables error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/tables/:id/waiters
// @desc    Add or remove waiters from a table
// @access  Private
router.post('/:id/waiters', protect, async (req, res) => {
  try {
    const { waiters, action } = req.body; // action = 'add' ou 'remove'
    
    if (!waiters || !Array.isArray(waiters) || waiters.length === 0) {
      return res.status(400).json({ message: 'É necessário fornecer pelo menos um ID de garçom' });
    }
    
    const table = await Table.findById(req.params.id).populate('assignedWaiters', 'name');
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    // Inicializar array se não existir
    if (!table.assignedWaiters) {
      table.assignedWaiters = [];
    }
    
    if (action === 'add') {
      // Adicionar garçons que ainda não estão associados à mesa
      waiters.forEach(waiterId => {
        if (!table.assignedWaiters.some(w => w._id.toString() === waiterId)) {
          table.assignedWaiters.push(waiterId);
        }
      });
    } else if (action === 'remove') {
      // Remover garçons específicos
      table.assignedWaiters = table.assignedWaiters.filter(
        w => !waiters.includes(w._id.toString())
      );
    }
    
    await table.save();
    
    const updatedTable = await Table.findById(req.params.id).populate('assignedWaiters', 'name');
    
    res.status(200).json({
      message: action === 'add' ? 'Garçons adicionados com sucesso' : 'Garçons removidos com sucesso',
      table: updatedTable
    });
  } catch (error) {
    console.error('Update table waiters error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/tables/:id/split
// @desc    Enable/disable bill splitting for a table and manage divisions
// @access  Private
router.post('/:id/split', protect, async (req, res) => {
  try {
    const { enabled, divisions } = req.body;
    
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    // Inicializar estrutura de conta dividida se não existir
    if (!table.splitBills) {
      table.splitBills = {
        enabled: false,
        divisions: []
      };
    }
    
    // Atualizar estado de divisão de conta
    if (enabled !== undefined) {
      table.splitBills.enabled = enabled;
    }
    
    // Atualizar divisões se fornecidas
    if (divisions) {
      table.splitBills.divisions = divisions;
    }
    
    await table.save();
    
    const updatedTable = await Table.findById(req.params.id)
      .populate('assignedWaiters', 'name')
      .populate('splitBills.divisions.waiter', 'name');
    
    res.status(200).json({
      message: 'Configurações de divisão de conta atualizadas com sucesso',
      table: updatedTable
    });
  } catch (error) {
    console.error('Update split bills error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

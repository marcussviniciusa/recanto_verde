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
      .populate('assignedWaiter', 'name')
      .populate('currentOrder');
    
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
// @desc    Get table by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('assignedWaiter', 'name')
      .populate({
        path: 'currentOrder',
        populate: {
          path: 'items.menuItem',
          model: 'MenuItem'
        }
      });
      
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
// @desc    Update table status
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, assignedWaiter, currentOrder } = req.body;
    
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    // Update fields if provided
    if (status) {
      table.status = status;
      
      // If table becomes occupied, set occupiedAt timestamp
      if (status === 'occupied' && table.status !== 'occupied') {
        table.occupiedAt = Date.now();
      }
      
      // If table becomes available, clear currentOrder and assignedWaiter
      if (status === 'available') {
        table.currentOrder = null;
        table.occupiedAt = null;
        
        // Keep the waiter assigned for tracking purposes
        // table.assignedWaiter = null;
      }
    }
    
    if (assignedWaiter) {
      table.assignedWaiter = assignedWaiter;
    }
    
    if (currentOrder) {
      table.currentOrder = currentOrder;
    }
    
    await table.save();
    
    // Populate related fields before returning
    const updatedTable = await Table.findById(req.params.id)
      .populate('assignedWaiter', 'name')
      .populate('currentOrder');
      
    res.json(updatedTable);
  } catch (error) {
    console.error('Update table error:', error);
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
      .populate('assignedWaiter', 'name')
      .populate('currentOrder');
      
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
      .populate('assignedWaiter', 'name')
      .populate('currentOrder');
      
    res.json(tables);
  } catch (error) {
    console.error('Get tables by status error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

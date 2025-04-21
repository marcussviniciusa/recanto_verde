const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      tableId, 
      items, 
      customerCount, 
      specialRequests 
    } = req.body;
    
    // Check if table exists and is available or occupied
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }
    
    if (table.status === 'reserved') {
      return res.status(400).json({ message: 'Mesa está reservada e não disponível' });
    }
    
    // Calculate total amount and prepare items with prices
    const orderItems = [];
    let totalAmount = 0;
    
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: `Item '${item.menuItemId}' não encontrado` });
      }
      
      if (!menuItem.available) {
        return res.status(400).json({ message: `Item '${menuItem.name}' não está disponível` });
      }
      
      orderItems.push({
        menuItem: menuItem._id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        price: menuItem.price
      });
      
      totalAmount += menuItem.price * item.quantity;
      
      // Update menu item popularity
      menuItem.popularity.orderCount += item.quantity;
      await menuItem.save();
    }
    
    // Create order
    const order = await Order.create({
      table: tableId,
      waiter: req.user._id,
      items: orderItems,
      totalAmount,
      customerCount,
      specialRequests,
      estimatedDeliveryTime: new Date(Date.now() + 20 * 60000) // 20 minutes from now
    });
    
    // Update table status
    table.status = 'occupied';
    table.currentOrder = order._id;
    table.assignedWaiter = req.user._id;
    
    if (!table.occupiedAt) {
      table.occupiedAt = Date.now();
    }
    
    await table.save();
    
    // Populate order details before returning
    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category image preparationTime');
    
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, paymentStatus, paymentMethod, items } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Update status if provided
    if (status) {
      order.status = status;
      
      // If order is completed, update timestamp and table status
      if (status === 'completed') {
        order.completedAt = Date.now();
        
        // Update table status
        const table = await Table.findById(order.table);
        if (table) {
          table.status = 'available';
          table.currentOrder = null;
          await table.save();
        }
        
        // Update waiter performance
        const waiter = await User.findById(order.waiter);
        if (waiter) {
          waiter.performance.ordersServed += 1;
          
          // Calculate service time
          if (table && table.occupiedAt && order.completedAt) {
            const serviceTime = (order.completedAt - table.occupiedAt) / (1000 * 60); // in minutes
            
            // Update average service time
            const currentTotal = waiter.performance.averageServiceTime * (waiter.performance.ordersServed - 1);
            const newAverage = (currentTotal + serviceTime) / waiter.performance.ordersServed;
            waiter.performance.averageServiceTime = Math.round(newAverage * 100) / 100; // round to 2 decimal places
          }
          
          await waiter.save();
        }
      }
    }
    
    // Update payment info if provided
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }
    
    // Update items if provided
    if (items && items.length > 0) {
      // Calculate new total amount
      let totalAmount = 0;
      
      for (const item of items) {
        const existingItem = order.items.id(item._id);
        if (existingItem) {
          // Update existing item
          existingItem.quantity = item.quantity || existingItem.quantity;
          existingItem.specialInstructions = item.specialInstructions || existingItem.specialInstructions;
          existingItem.status = item.status || existingItem.status;
          
          // Recalculate subtotal
          totalAmount += existingItem.price * existingItem.quantity;
        }
      }
      
      order.totalAmount = totalAmount;
    }
    
    order.updatedAt = Date.now();
    await order.save();
    
    // Populate order details before returning
    const updatedOrder = await Order.findById(req.params.id)
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/orders/:id/item/:itemId
// @desc    Update order item status
// @access  Private
router.put('/:id/item/:itemId', protect, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Find the order item
    const orderItem = order.items.id(req.params.itemId);
    if (!orderItem) {
      return res.status(404).json({ message: 'Item do pedido não encontrado' });
    }
    
    // Update status
    orderItem.status = status;
    order.updatedAt = Date.now();
    
    await order.save();
    
    // Populate order details before returning
    const updatedOrder = await Order.findById(req.params.id)
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order item error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order
// @access  Private/Superadmin
router.delete('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Instead of deleting, change status to cancelled
    order.status = 'cancelled';
    order.updatedAt = Date.now();
    await order.save();
    
    // Update table status if this was the current order
    const table = await Table.findById(order.table);
    if (table && table.currentOrder && table.currentOrder.toString() === order._id.toString()) {
      table.status = 'available';
      table.currentOrder = null;
      await table.save();
    }
    
    res.json({ message: 'Pedido cancelado com sucesso' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/orders/table/:tableId
// @desc    Get orders for a specific table
// @access  Private
router.get('/table/:tableId', protect, async (req, res) => {
  try {
    const orders = await Order.find({ 
      table: req.params.tableId,
      status: { $ne: 'cancelled' }
    })
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.json(orders);
  } catch (error) {
    console.error('Get table orders error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/orders/waiter/:waiterId
// @desc    Get orders for a specific waiter
// @access  Private/Superadmin
router.get('/waiter/:waiterId', protect, authorize('superadmin'), async (req, res) => {
  try {
    const orders = await Order.find({ waiter: req.params.waiterId })
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.json(orders);
  } catch (error) {
    console.error('Get waiter orders error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/orders/active
// @desc    Get all active orders
// @access  Private
router.get('/status/active', protect, async (req, res) => {
  try {
    const orders = await Order.find({ status: 'active' })
      .populate('table', 'tableNumber')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price category');
    
    res.json(orders);
  } catch (error) {
    console.error('Get active orders error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

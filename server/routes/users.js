const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (for admin dashboard)
// @access  Private/Superadmin
router.get('/', protect, authorize('superadmin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Superadmin
router.get('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Superadmin
router.put('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { name, email, role, active } = req.body;
    
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.active = active !== undefined ? active : user.active;
    user.updatedAt = Date.now();
    
    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (or deactivate)
// @access  Private/Superadmin
router.delete('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Instead of deleting, we deactivate
    user.active = false;
    await user.save();
    
    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   DELETE /api/users/:id/permanent
// @desc    Permanently delete user
// @access  Private/Superadmin
router.delete('/:id/permanent', protect, authorize('superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Check if user is a superadmin - prevent deletion of superadmins
    if (user.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Não é possível excluir permanentemente um administrador'
      });
    }
    
    // Check if user has associated orders
    const Order = require('../models/Order');
    const hasOrders = await Order.exists({ assignedWaiter: user._id });
    
    if (hasOrders) {
      return res.status(400).json({ 
        message: 'Não é possível excluir um usuário que tem pedidos associados'
      });
    }
    
    // Permanently delete the user
    await User.deleteOne({ _id: user._id });
    
    res.json({ message: 'Usuário excluído permanentemente com sucesso' });
  } catch (error) {
    console.error('Permanent delete user error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/users/waiters
// @desc    Get all active waiters
// @access  Private/Superadmin
router.get('/role/waiters', protect, authorize('superadmin'), async (req, res) => {
  try {
    const waiters = await User.find({ 
      role: 'waiter', 
      active: true 
    }).select('-password');
    
    res.json(waiters);
  } catch (error) {
    console.error('Get waiters error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/users/:id/performance
// @desc    Update user performance metrics
// @access  Private/Superadmin
router.put('/:id/performance', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { ordersServed, averageServiceTime, customerRating } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Update performance metrics
    if (ordersServed) {
      user.performance.ordersServed = ordersServed;
    }
    
    if (averageServiceTime) {
      user.performance.averageServiceTime = averageServiceTime;
    }
    
    if (customerRating) {
      user.performance.customerRatings.push(customerRating);
    }
    
    await user.save();
    res.json({ message: 'Performance atualizada com sucesso', user });
  } catch (error) {
    console.error('Update performance error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

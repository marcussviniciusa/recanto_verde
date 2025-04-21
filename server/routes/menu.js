const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/menu
// @desc    Get all menu items
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/menu
// @desc    Create a new menu item
// @access  Private/Superadmin
router.post('/', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      category, 
      available, 
      image, 
      preparationTime,
      isSpecial,
      ingredients,
      nutritionalInfo
    } = req.body;
    
    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      category,
      available: available !== undefined ? available : true,
      image,
      preparationTime: preparationTime || 15,
      isSpecial: isSpecial || false,
      ingredients: ingredients || [],
      nutritionalInfo: nutritionalInfo || {}
    });
    
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/menu/:id
// @desc    Get menu item by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Item do cardápio não encontrado' });
    }
    
    res.json(menuItem);
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private/Superadmin
router.put('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      category, 
      available, 
      image, 
      preparationTime,
      isSpecial,
      ingredients,
      nutritionalInfo
    } = req.body;
    
    let menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Item do cardápio não encontrado' });
    }
    
    // Update fields if provided
    if (name) menuItem.name = name;
    if (description) menuItem.description = description;
    if (price !== undefined) menuItem.price = price;
    if (category) menuItem.category = category;
    if (available !== undefined) menuItem.available = available;
    if (image) menuItem.image = image;
    if (preparationTime) menuItem.preparationTime = preparationTime;
    if (isSpecial !== undefined) menuItem.isSpecial = isSpecial;
    if (ingredients) menuItem.ingredients = ingredients;
    if (nutritionalInfo) menuItem.nutritionalInfo = nutritionalInfo;
    
    menuItem.updatedAt = Date.now();
    
    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
// @access  Private/Superadmin
router.delete('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Item do cardápio não encontrado' });
    }
    
    // Correção: usando findByIdAndDelete em vez de .remove()
    await MenuItem.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Item do cardápio removido com sucesso' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/menu/category/:category
// @desc    Get menu items by category
// @access  Private
router.get('/category/:category', protect, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ 
      category: req.params.category,
      available: true
    });
    
    res.json(menuItems);
  } catch (error) {
    console.error('Get menu by category error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/menu/special/featured
// @desc    Get featured/special menu items
// @access  Private
router.get('/special/featured', protect, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ 
      isSpecial: true,
      available: true
    });
    
    res.json(menuItems);
  } catch (error) {
    console.error('Get special menu items error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/menu/:id/popularity
// @desc    Update menu item popularity
// @access  Private
router.put('/:id/popularity', protect, async (req, res) => {
  try {
    const { orderCount, rating } = req.body;
    
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Item do cardápio não encontrado' });
    }
    
    // Update popularity metrics
    if (orderCount !== undefined) {
      menuItem.popularity.orderCount = orderCount;
    }
    
    if (rating !== undefined) {
      menuItem.popularity.rating = rating;
    }
    
    await menuItem.save();
    res.json({ message: 'Popularidade atualizada com sucesso', menuItem });
  } catch (error) {
    console.error('Update popularity error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

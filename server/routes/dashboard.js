const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary data (for superadmin)
// @access  Private/Superadmin
router.get('/summary', protect, authorize('superadmin'), async (req, res) => {
  try {
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tables summary
    const tablesCount = await Table.countDocuments();
    const availableTables = await Table.countDocuments({ status: 'available' });
    const occupiedTables = await Table.countDocuments({ status: 'occupied' });
    
    // Get orders summary
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ status: 'active' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    
    // Get today's orders
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Get today's revenue
    const todayRevenue = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: today },
        status: 'completed',
        paymentStatus: 'paid'
      }},
      { $group: { _id: null, total: { $sum: '$totalAmount' } }}
    ]);
    
    // Get menu items summary
    const menuItems = await MenuItem.countDocuments();
    const availableItems = await MenuItem.countDocuments({ available: true });
    
    // Get users summary
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ active: true });
    const waiters = await User.countDocuments({ role: 'waiter' });
    
    // Get top selling menu items
    const topSellingItems = await MenuItem.find()
      .sort({ 'popularity.orderCount': -1 })
      .limit(5);
    
    // Response object
    const summary = {
      tables: {
        total: tablesCount,
        available: availableTables,
        occupied: occupiedTables,
        occupancyRate: tablesCount > 0 ? (occupiedTables / tablesCount) * 100 : 0
      },
      orders: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
        today: todayOrders
      },
      revenue: {
        today: todayRevenue.length > 0 ? todayRevenue[0].total : 0
      },
      menu: {
        total: menuItems,
        available: availableItems
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        waiters
      },
      topSellingItems: topSellingItems.map(item => ({
        id: item._id,
        name: item.name,
        category: item.category,
        orderCount: item.popularity.orderCount
      }))
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/dashboard/sales/history
// @desc    Get sales history for analysis
// @access  Private/Superadmin
router.get('/sales/history', protect, authorize('superadmin'), async (req, res) => {
  try {
    // Get date range from query parameters (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));
    
    // Aggregate daily sales data
    const dailySales = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
          },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Aggregate sales by category
    const salesByCategory = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed',
          paymentStatus: 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItemDetails'
        }
      },
      { $unwind: '$menuItemDetails' },
      {
        $group: {
          _id: '$menuItemDetails.category',
          totalSales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          itemCount: { $sum: '$items.quantity' }
        }
      }
    ]);
    
    // Aggregate hourly traffic pattern
    const hourlyTraffic = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      dailySales,
      salesByCategory,
      hourlyTraffic
    });
  } catch (error) {
    console.error('Sales history error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/dashboard/predictions/occupancy
// @desc    Get occupancy predictions based on historical data
// @access  Private/Superadmin
router.get('/predictions/occupancy', protect, authorize('superadmin'), async (req, res) => {
  try {
    // Get date for which to predict (default to today)
    const targetDate = new Date();
    if (req.query.targetDate) {
      targetDate.setTime(Date.parse(req.query.targetDate));
    }
    
    const dayOfWeek = targetDate.getDay();
    const monthOfYear = targetDate.getMonth();
    
    // Get historical data for up to 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Get historical occupancy by hour for the same day of the week
    const hourlyOccupancy = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $in: ['completed', 'active'] }
        }
      },
      {
        $addFields: {
          hourOfDay: { $hour: "$createdAt" },
          dayOfWeek: { $dayOfWeek: "$createdAt" }
        }
      },
      {
        $match: {
          dayOfWeek: dayOfWeek + 1 // MongoDB $dayOfWeek is 1-7, JS getDay() is 0-6
        }
      },
      {
        $group: {
          _id: "$hourOfDay",
          orderCount: { $sum: 1 },
          averageCustomers: { $avg: "$customerCount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Forecasted occupancy based on historical data
    // This is a simplified model - in a real-world scenario, 
    // you would implement more sophisticated ML models
    const forecastedOccupancy = hourlyOccupancy.map(hour => {
      // Get current restaurant capacity
      const capacityFactor = 1.2; // Seasonal adjustment factor
      
      return {
        hour: hour._id,
        predictedOrders: Math.round(hour.orderCount / (hourlyOccupancy.length ? hourlyOccupancy.length : 1) * capacityFactor),
        predictedCustomers: Math.round(hour.averageCustomers * capacityFactor),
        confidenceLevel: 'medium' // Simplified confidence metric
      };
    });
    
    // Seasonal adjustments based on month
    const seasonalFactors = [0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.9, 1.1]; // Example factors by month
    const seasonalFactor = seasonalFactors[monthOfYear];
    
    // Apply seasonal adjustments
    const adjustedForecast = forecastedOccupancy.map(hour => ({
      ...hour,
      predictedOrders: Math.round(hour.predictedOrders * seasonalFactor),
      predictedCustomers: Math.round(hour.predictedCustomers * seasonalFactor)
    }));
    
    res.json({
      targetDate: targetDate.toISOString().split('T')[0],
      dayOfWeek,
      seasonalFactor,
      hourlyPredictions: adjustedForecast,
      historicalData: hourlyOccupancy
    });
  } catch (error) {
    console.error('Occupancy prediction error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/dashboard/analysis/menu
// @desc    Get menu analysis and insights
// @access  Private/Superadmin
router.get('/analysis/menu', protect, authorize('superadmin'), async (req, res) => {
  try {
    // Get menu items with popularity data
    const menuItems = await MenuItem.find().sort({ 'popularity.orderCount': -1 });
    
    // Calculate average popularity
    const totalOrderCount = menuItems.reduce((sum, item) => sum + item.popularity.orderCount, 0);
    const averageOrderCount = totalOrderCount / menuItems.length;
    
    // Categorize items by popularity
    const popularityCategories = {
      highPerformers: [],
      averagePerformers: [],
      lowPerformers: []
    };
    
    menuItems.forEach(item => {
      const performanceRatio = item.popularity.orderCount / averageOrderCount;
      
      if (performanceRatio >= 1.5) {
        popularityCategories.highPerformers.push({
          id: item._id,
          name: item.name,
          category: item.category,
          orderCount: item.popularity.orderCount,
          performanceRatio: Math.round(performanceRatio * 100) / 100
        });
      } else if (performanceRatio >= 0.5) {
        popularityCategories.averagePerformers.push({
          id: item._id,
          name: item.name,
          category: item.category,
          orderCount: item.popularity.orderCount,
          performanceRatio: Math.round(performanceRatio * 100) / 100
        });
      } else {
        popularityCategories.lowPerformers.push({
          id: item._id,
          name: item.name,
          category: item.category,
          orderCount: item.popularity.orderCount,
          performanceRatio: Math.round(performanceRatio * 100) / 100
        });
      }
    });
    
    // Find common item combinations (simplified recommendation engine)
    // In a real-world scenario, this would use more sophisticated analytics
    const itemCombinations = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          itemIds: { $push: '$items.menuItem' }
        }
      },
      { $unwind: '$itemIds' },
      {
        $group: {
          _id: '$itemIds',
          coOccurringOrders: { $push: '$_id' }
        }
      }
    ]);
    
    // Calculate insights
    const insights = {
      totalItems: menuItems.length,
      popularityDistribution: {
        highPerformers: popularityCategories.highPerformers.length,
        averagePerformers: popularityCategories.averagePerformers.length,
        lowPerformers: popularityCategories.lowPerformers.length
      },
      recommendations: {
        promoteItems: popularityCategories.lowPerformers.slice(0, 3),
        featuredItems: popularityCategories.highPerformers.slice(0, 5)
      },
      categories: {
        mostPopular: await MenuItem.aggregate([
          { $group: { _id: '$category', count: { $sum: '$popularity.orderCount' } } },
          { $sort: { count: -1 } },
          { $limit: 1 }
        ])
      }
    };
    
    res.json({
      popularityCategories,
      insights
    });
  } catch (error) {
    console.error('Menu analysis error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   GET /api/dashboard/performance/waiters
// @desc    Get performance metrics for waiters
// @access  Private/Superadmin
router.get('/performance/waiters', protect, authorize('superadmin'), async (req, res) => {
  try {
    // Get all waiters with performance data
    const waiters = await User.find({ role: 'waiter' })
      .select('name performance active');
    
    // Calculate average service time across all waiters
    const totalServiceTime = waiters.reduce((sum, waiter) => {
      return sum + (waiter.performance.averageServiceTime || 0);
    }, 0);
    
    const averageServiceTime = totalServiceTime / waiters.length;
    
    // Calculate average orders served
    const totalOrdersServed = waiters.reduce((sum, waiter) => {
      return sum + (waiter.performance.ordersServed || 0);
    }, 0);
    
    const averageOrdersServed = totalOrdersServed / waiters.length;
    
    // Calculate performance metrics
    const waiterPerformance = waiters.map(waiter => {
      const serviceTimeRatio = waiter.performance.averageServiceTime > 0 
        ? averageServiceTime / waiter.performance.averageServiceTime
        : 0;
        
      const ordersServedRatio = averageOrdersServed > 0
        ? waiter.performance.ordersServed / averageOrdersServed
        : 0;
      
      // Calculate overall performance score (higher is better)
      const performanceScore = ((serviceTimeRatio * 0.6) + (ordersServedRatio * 0.4)) * 100;
      
      return {
        id: waiter._id,
        name: waiter.name,
        active: waiter.active,
        ordersServed: waiter.performance.ordersServed,
        averageServiceTime: waiter.performance.averageServiceTime,
        ordersServedRatio: Math.round(ordersServedRatio * 100) / 100,
        serviceTimeRatio: Math.round(serviceTimeRatio * 100) / 100,
        performanceScore: Math.round(performanceScore)
      };
    });
    
    // Sort by performance score (highest first)
    waiterPerformance.sort((a, b) => b.performanceScore - a.performanceScore);
    
    res.json({
      waiterPerformance,
      averages: {
        serviceTime: Math.round(averageServiceTime * 100) / 100,
        ordersServed: Math.round(averageOrdersServed * 100) / 100
      }
    });
  } catch (error) {
    console.error('Waiter performance error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tableRoutes = require('./routes/tables');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false
});

// Tornar o objeto io acessível para as rotas
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a room based on user role
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });
  
  // Update tables status
  socket.on('updateTable', (data) => {
    io.to('superadmin').emit('tableUpdated', data);
    io.to('waiter').emit('tableUpdated', data); // Também notificar garçons
  });
  
  // Específico para mudanças de status de mesa
  socket.on('tableStatusChange', (data) => {
    console.log('Table status change event received:', data);
    io.to('superadmin').emit('tableStatusChanged', data);
    io.to('waiter').emit('tableStatusChanged', data);
  });
  
  // New order notification
  socket.on('newOrder', (data) => {
    io.to('superadmin').emit('orderNotification', data);
    // Enviar notificação também para outros garçons
    io.to('waiter').emit('orderNotification', data);
  });
  
  // Order ready notification
  socket.on('orderReady', (data) => {
    io.to('waiter').emit('readyNotification', data);
  });
  
  // Payment request notification
  socket.on('requestPayment', (data) => {
    console.log('Payment request received:', data);
    io.to('superadmin').emit('paymentRequestNotification', data);
    io.to('waiter').emit('paymentRequestNotification', data);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}): ${reason}`);
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// No need to serve static files - this is handled by Nginx in the frontend container

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/recanto_verde';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error: ', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? err.message : {} });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

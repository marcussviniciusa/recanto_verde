import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    // Only connect to socket if user is logged in
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to socket
    const socketInstance = io(process.env.REACT_APP_SOCKET_URL || '', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      
      // Join room based on user role
      socketInstance.emit('join', user.role);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Listen for notifications based on user role
    if (user.role === 'superadmin') {
      // Listen for table updates
      socketInstance.on('tableUpdated', (data) => {
        console.log('Table updated:', data);
        addNotification({
          type: 'table',
          message: `Mesa ${data.tableNumber} agora está ${data.status === 'available' ? 'disponível' : 'ocupada'}`,
          data
        });
      });

      // Listen for new orders
      socketInstance.on('orderNotification', (data) => {
        console.log('New order:', data);
        addNotification({
          type: 'order',
          message: `Novo pedido para a mesa ${data.tableNumber}`,
          data
        });
      });
    } else if (user.role === 'waiter') {
      // Listen for order ready notifications
      socketInstance.on('readyNotification', (data) => {
        console.log('Order ready:', data);
        addNotification({
          type: 'ready',
          message: `Pedido pronto para a mesa ${data.tableNumber}`,
          data
        });
      });
    }

    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  // Add notification
  const addNotification = (notification) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        timestamp: new Date(),
        read: false,
        ...notification
      },
      ...prev
    ]);
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Emit events
  const emitTableUpdate = (tableData) => {
    if (socket && connected) {
      socket.emit('updateTable', tableData);
    }
  };

  const emitNewOrder = (orderData) => {
    if (socket && connected) {
      socket.emit('newOrder', orderData);
    }
  };

  const emitOrderReady = (orderData) => {
    if (socket && connected) {
      socket.emit('orderReady', orderData);
    }
  };

  const value = {
    socket,
    connected,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    addNotification,
    markAsRead,
    clearNotifications,
    emitTableUpdate,
    emitNewOrder,
    emitOrderReady
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

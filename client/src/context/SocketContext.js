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
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
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
        if (data && data.tableNumber) {
          addNotification({
            type: 'table',
            message: `Mesa ${data.tableNumber} agora está ${data.status === 'available' ? 'disponível' : 'ocupada'}`,
            data
          });
        } else {
          console.warn('Recebidos dados inválidos para tableUpdated:', data);
        }
      });

      // Listen for new orders
      socketInstance.on('orderNotification', (data) => {
        console.log('New order:', data);
        if (data && data.tableNumber) {
          addNotification({
            type: 'order',
            message: `Novo pedido para a mesa ${data.tableNumber}`,
            data
          });
        } else {
          console.warn('Recebidos dados inválidos para orderNotification:', data);
        }
      });
      
      // Listen for payment requests
      socketInstance.on('paymentRequestNotification', (data) => {
        console.log('Payment request:', data);
        if (data && data.tableNumber) {
          addNotification({
            type: 'payment',
            message: `Solicitação de pagamento para mesa ${data.tableNumber} - R$ ${data.totalAmount.toFixed(2)}`,
            data
          });
        } else {
          console.warn('Recebidos dados inválidos para paymentRequestNotification:', data);
        }
      });
    } else if (user.role === 'waiter') {
      // Listen for order ready notifications
      socketInstance.on('readyNotification', (data) => {
        console.log('Order ready:', data);
        if (data && data.tableNumber) {
          addNotification({
            type: 'ready',
            message: `Pedido pronto para a mesa ${data.tableNumber}`,
            data
          });
        } else {
          console.warn('Recebidos dados inválidos para readyNotification:', data);
        }
      });
      
      // Listen for payment requests
      socketInstance.on('paymentRequestNotification', (data) => {
        console.log('Payment request:', data);
        if (data && data.tableNumber) {
          addNotification({
            type: 'payment',
            message: `Solicitação de pagamento para mesa ${data.tableNumber} - R$ ${data.totalAmount.toFixed(2)}`,
            data
          });
        } else {
          console.warn('Recebidos dados inválidos para paymentRequestNotification:', data);
        }
      });
      
      // Listen for table status changed notifications
      socketInstance.on('tableStatusChanged', (data) => {
        console.log('Table status changed:', data);
        if (data && data.tableId) {
          addNotification({
            type: 'tableStatus',
            message: data.tableNumber 
              ? `Mesa ${data.tableNumber} agora está ${data.status === 'available' ? 'disponível' : 'ocupada'}`
              : `Status de mesa atualizado para ${data.status === 'available' ? 'disponível' : 'ocupada'}`,
            data
          });
        } else {
          console.warn('Recebidos dados inválidos para tableStatusChanged:', data);
        }
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
      // Verificar se os dados são válidos antes de enviar
      if (tableData && (tableData.tableId || tableData._id)) {
        console.log('Emitindo updateTable:', tableData);
        socket.emit('updateTable', tableData);
      } else {
        console.warn('Tentativa de emitir evento updateTable com dados inválidos:', tableData);
      }
    } else if (!socket) {
      console.warn('Socket não inicializado ao emitir updateTable');
    } else if (!connected) {
      console.warn('Socket não conectado ao emitir updateTable');
    }
  };

  const emitNewOrder = (orderData) => {
    if (socket && connected) {
      // Verificar se os dados são válidos antes de enviar
      if (orderData && (orderData.orderId || orderData._id)) {
        console.log('Emitindo newOrder:', orderData);
        socket.emit('newOrder', orderData);
      } else {
        console.warn('Tentativa de emitir evento newOrder com dados inválidos:', orderData);
      }
    }
  };

  const emitOrderReady = (orderData) => {
    if (socket && connected) {
      // Verificar se os dados são válidos antes de enviar
      if (orderData && (orderData.orderId || orderData._id)) {
        console.log('Emitindo orderReady:', orderData);
        socket.emit('orderReady', orderData);
      } else {
        console.warn('Tentativa de emitir evento orderReady com dados inválidos:', orderData);
      }
    }
  };
  
  const emitRequestPayment = (paymentData) => {
    if (socket && connected) {
      // Verificar se os dados são válidos antes de enviar
      if (paymentData && paymentData.tableId && paymentData.totalAmount) {
        console.log('Emitindo requestPayment:', paymentData);
        socket.emit('requestPayment', paymentData);
      } else {
        console.warn('Tentativa de emitir evento requestPayment com dados inválidos:', paymentData);
      }
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
    emitOrderReady,
    emitRequestPayment
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

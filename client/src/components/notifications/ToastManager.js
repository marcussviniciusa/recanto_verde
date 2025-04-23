import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import NotificationToast from './NotificationToast';

// Componente para gerenciar os toasts de notificações prioritárias
const ToastManager = () => {
  const { notifications } = useSocket();
  const [activeToasts, setActiveToasts] = useState([]);
  
  // Monitorar notificações de alta prioridade
  useEffect(() => {
    // Verificar se há novas notificações prioritárias
    const highPriorityNotifications = notifications.filter(
      n => n.priority === 'high' && !n.read && !activeToasts.some(t => t.id === n.id)
    );
    
    // Limitar o número de toasts exibidos simultaneamente
    if (highPriorityNotifications.length > 0) {
      // Adicionar até 3 notificações ao mesmo tempo
      const newToasts = [...activeToasts];
      
      highPriorityNotifications.slice(0, 3 - activeToasts.length).forEach(notification => {
        if (!newToasts.some(toast => toast.id === notification.id)) {
          newToasts.push(notification);
        }
      });
      
      setActiveToasts(newToasts);
    }
  }, [notifications, activeToasts]);
  
  // Remover um toast específico
  const handleCloseToast = (id) => {
    setActiveToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  return (
    <>
      {activeToasts.map((toast, index) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onClose={() => handleCloseToast(toast.id)}
          autoHideDuration={6000 + (index * 1000)} // Escalonar o tempo de exibição
        />
      ))}
    </>
  );
};

export default ToastManager;

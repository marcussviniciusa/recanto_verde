import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Set auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user data
        const response = await axios.get('/api/auth/me');
        
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear token if invalid
        localStorage.removeItem('token');
        axios.defaults.headers.common['Authorization'] = '';
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/login', { email, password });
      
      // Store token and set auth header
      localStorage.setItem('token', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      // Set user data
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Erro ao fazer login';
      setError(message);
      throw new Error(message);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    axios.defaults.headers.common['Authorization'] = '';
    setUser(null);
  };

  // Register function (for superadmin to create waiter accounts)
  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      // Mensagem mais detalhada de erro
      let errorMessage = 'Erro ao registrar usuário';
      
      if (error.response) {
        // O servidor respondeu com um status de erro
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        errorMessage = 'Não foi possível conectar ao servidor';
      } else if (error.message) {
        // Erro durante a configuração da requisição
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

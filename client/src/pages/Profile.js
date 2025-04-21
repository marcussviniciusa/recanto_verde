import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyIcon from '@mui/icons-material/Key';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';

const Profile = () => {
  const { user, logout } = useAuth();
  
  // Form states
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // User data form
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setEditing(!editing);
    setError(null);
    setSuccess(null);
    
    // Reset form data if canceling edit
    if (editing) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };
  
  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      setError('O nome é obrigatório');
      return;
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Prepare update data
      const updateData = {
        name: formData.name,
      };
      
      // Add password update if provided
      if (formData.currentPassword && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      // Call API to update profile
      await axios.put(`/api/users/profile`, updateData);
      
      // Update success
      setSuccess('Perfil atualizado com sucesso');
      setEditing(false);
      
      // Reset password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };
  
  // Get role display name
  const getRoleName = (role) => {
    switch (role) {
      case 'superadmin':
        return 'Administrador';
      case 'waiter':
        return 'Garçom';
      default:
        return role;
    }
  };
  
  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Meu Perfil
        </Typography>
        
        <Paper elevation={2} sx={{ p: 4, mt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: '2rem',
                mr: 3
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
            
            <Box>
              <Typography variant="h5">
                {user?.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.email}
              </Typography>
              <Chip
                label={getRoleName(user?.role)}
                color={user?.role === 'superadmin' ? 'primary' : 'secondary'}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
          
          <Divider sx={{ mb: 4 }} />
          
          <Box component="form" onSubmit={handleUpdateProfile}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Informações Pessoais
                  </Typography>
                  
                  {!editing ? (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={toggleEditMode}
                    >
                      Editar
                    </Button>
                  ) : (
                    <Box>
                      <IconButton
                        color="error"
                        onClick={toggleEditMode}
                        sx={{ mr: 1 }}
                      >
                        <CancelIcon />
                      </IconButton>
                      
                      <IconButton
                        color="primary"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : <SaveIcon />}
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!editing || loading}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={formData.email}
                  disabled={true} // Email can't be changed
                />
              </Grid>
              
              {editing && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 2 }}>
                      <KeyIcon sx={{ mr: 1 }} />
                      Alterar Senha (opcional)
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Senha Atual"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Nova Senha"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Confirmar Nova Senha"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      error={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''}
                      helperText={
                        formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''
                          ? 'As senhas não coincidem'
                          : ''
                      }
                    />
                  </Grid>
                </>
              )}
            </Grid>
            
            {editing && (
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={toggleEditMode}
                  sx={{ mr: 2 }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
        
        {/* Account section */}
        <Paper elevation={2} sx={{ p: 4, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Conta
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={logout}
            >
              Sair da Conta
            </Button>
          </Box>
        </Paper>
      </Box>
    </AppLayout>
  );
};

export default Profile;

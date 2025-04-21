import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Chip,
  Switch,
  FormControlLabel,
  Avatar,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StarIcon from '@mui/icons-material/Star';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import AppLayout from '../../components/layout/AppLayout';

const UserManagement = () => {
  const { register } = useAuth();
  
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  // Dialog states
  const [userDialog, setUserDialog] = useState({
    open: false,
    isEdit: false,
    user: {
      name: '',
      email: '',
      password: '',
      role: 'waiter',
      active: true
    }
  });
  
  // Performance dialog
  const [performanceDialog, setPerformanceDialog] = useState({
    open: false,
    user: null
  });
  
  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    user: null,
    permanent: false
  });
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/users');
        console.log('Dados iniciais de usuários:', response.data);
        setUsers(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Erro ao carregar usuários. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Função para recarregar usuários
  const reloadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
      console.log('Dados de usuários carregados:', response.data);
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error reloading users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar depuração para verificar os dados filtrados
  useEffect(() => {
    console.log('Estado atual de usuários:', users);
    // Verificar o estado antes de filtrar
    if (users && users.length > 0) {
      console.log('Primeiro usuário:', users[0]);
    }
  }, [users]);

  // Handle dialog open for new user
  const handleAddUser = () => {
    setUserDialog({
      open: true,
      isEdit: false,
      user: {
        name: '',
        email: '',
        password: '',
        role: 'waiter',
        active: true
      }
    });
  };
  
  // Handle dialog open for edit
  const handleEditUser = (userData) => {
    // Clone the user to avoid direct state mutation
    const editUser = { ...userData };
    
    // Remove sensitive data when editing
    delete editUser.password;
    
    setUserDialog({
      open: true,
      isEdit: true,
      user: editUser
    });
  };
  
  // Handle form change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setUserDialog({
      ...userDialog,
      user: {
        ...userDialog.user,
        [name]: type === 'checkbox' ? checked : value
      }
    });
  };
  
  // Handle save user
  const handleSaveUser = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const { user: userData, isEdit } = userDialog;
      
      // Validate form
      if (!userData.name.trim() || !userData.email.trim()) {
        setError('Por favor, preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }
      
      if (!isEdit && !userData.password) {
        setError('A senha é obrigatória para novos usuários');
        setLoading(false);
        return;
      }
      
      let response;
      
      if (isEdit) {
        // Update existing user
        response = await axios.put(`/api/users/${userData._id}`, userData);
        
        // Update local state
        setUsers(users.map(u => 
          u._id === userData._id ? response.data : u
        ));
        
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        try {
          // Create new user
          // Verificar se o e-mail já existe antes de registrar
          const checkUser = users.find(u => u.email === userData.email);
          if (checkUser) {
            throw new Error('Usuário com este e-mail já existe.');
          }
          
          // Preparar dados para envio
          const newUserData = {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role
          };
          
          response = await register(newUserData);
          
          // Recarregar a lista de usuários para garantir consistência
          await reloadUsers();
          
          setSuccess('Usuário adicionado com sucesso!');
          
          // Close dialog on success
          setUserDialog({
            ...userDialog,
            open: false
          });
        } catch (registerError) {
          setError(registerError.message || 'Erro ao criar usuário. Verifique se o e-mail já está em uso.');
          setLoading(false);
          return;
        }
      }
      
      // Close dialog
      setUserDialog({
        ...userDialog,
        open: false
      });
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.message || 'Erro ao salvar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle toggle user active status
  const handleToggleActive = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Toggle active status
      const updatedUser = {
        ...userData,
        active: !userData.active
      };
      
      // Update in API
      const response = await axios.put(`/api/users/${userData._id}`, updatedUser);
      
      // Update local state
      setUsers(users.map(u => 
        u._id === userData._id ? response.data : u
      ));
      
      setSuccess(`Usuário ${userData.active ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar status do usuário.');
    } finally {
      setLoading(false);
    }
  };

  // Handle permanent deletion of a user
  const handlePermanentDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Call API to permanently delete the user
      await axios.delete(`/api/users/${deleteDialog.user._id}/permanent`);
      
      // Update local state by removing the user
      setUsers(users.filter(u => u._id !== deleteDialog.user._id));
      
      setSuccess('Usuário excluído permanentemente com sucesso!');
      
      // Close dialog
      setDeleteDialog({
        open: false,
        user: null,
        permanent: false
      });
    } catch (err) {
      console.error('Error permanently deleting user:', err);
      const errorMessage = err.response?.data?.message || 'Erro ao excluir usuário permanentemente.';
      setError(errorMessage);
      // Manter o diálogo aberto em caso de erro
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deletion confirmation
  const handleDeleteConfirm = async () => {
    if (deleteDialog.permanent) {
      await handlePermanentDelete();
    } else {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        // Desativar o usuário
        const updatedUser = {
          ...deleteDialog.user,
          active: false
        };
        
        // Update in API
        await axios.put(`/api/users/${deleteDialog.user._id}`, updatedUser);
        
        // Update local state
        setUsers(users.map(u => 
          u._id === deleteDialog.user._id ? {...u, active: false} : u
        ));
        
        setSuccess('Usuário desativado com sucesso!');
        
        // Close dialog
        setDeleteDialog({
          open: false,
          user: null,
          permanent: false
        });
      } catch (err) {
        console.error('Error deactivating user:', err);
        setError(err.response?.data?.message || 'Erro ao desativar usuário.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Open dialog for deactivation
  const handleOpenDeleteDialog = (user, permanent = false) => {
    setDeleteDialog({
      open: true,
      user,
      permanent
    });
  };
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Filter users
  const filteredUsers = users.filter(user => {
    // Filtro por texto de busca
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por função (role)
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    // Resultado final do filtro
    return matchesSearch && matchesRole;
  });
  
  // Paginated users
  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Log para depuração dos filtros
  useEffect(() => {
    console.log('Total de usuários no estado:', users.length);
    console.log('Usuários após filtro:', filteredUsers.length);
    console.log('Usuários na página atual:', paginatedUsers.length);
    
    // Depuração detalhada dos filtros
    if (users.length > 0 && filteredUsers.length === 0) {
      console.warn('Filtro está removendo todos os usuários!');
      users.forEach((user, idx) => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        console.log(`Usuário ${idx + 1} (${user.name}): matchesSearch=${matchesSearch}, matchesRole=${matchesRole}`);
      });
    }
  }, [users, filteredUsers, paginatedUsers, searchTerm, filterRole, page, rowsPerPage]);
  
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
  
  // Get user initials for avatar
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gerenciamento de Usuários
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adicione, edite ou remova usuários do sistema.
        </Typography>
      </Box>
      
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
      
      {/* Search and filter toolbar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Pesquisar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Função</InputLabel>
              <Select
                value={filterRole}
                label="Função"
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="superadmin">Administrador</MenuItem>
                <MenuItem value="waiter">Garçom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddUser}
            >
              Adicionar Usuário
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Users table */}
      <Paper elevation={2}>
        {loading && users.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 4
          }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              Nenhum usuário encontrado. Tente ajustar a pesquisa ou adicionar novos usuários.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 650 }} aria-label="users table">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Função</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Pedidos Atendidos</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((userData) => (
                    <TableRow key={userData._id}>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: userData.active ? 'primary.main' : 'grey.400' }}>
                            {getInitials(userData.name)}
                          </Avatar>
                          <Typography variant="subtitle2">{userData.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getRoleName(userData.role)} 
                          color={userData.role === 'superadmin' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={userData.active ? 'Ativo' : 'Inativo'} 
                          color={userData.active ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {userData.performance?.ordersServed || 0}
                      </TableCell>
                      <TableCell align="center">
                        {userData.role === 'waiter' && (
                          <IconButton 
                            size="small" 
                            onClick={() => setPerformanceDialog({ open: true, user: userData })}
                            title="Ver performance"
                          >
                            <AssessmentIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleEditUser(userData)}
                          title="Editar"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color={userData.active ? 'error' : 'success'}
                          onClick={() => handleToggleActive(userData)}
                          title={userData.active ? 'Desativar' : 'Ativar'}
                        >
                          {userData.active ? <DeleteIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                        </IconButton>
                        {userData.role !== 'superadmin' && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleOpenDeleteDialog(userData, true)}
                            title="Excluir permanentemente"
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" sx={{ color: 'error.dark' }} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Paper>
      
      {/* User Form Dialog */}
      <Dialog 
        open={userDialog.open} 
        onClose={() => setUserDialog({ ...userDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {userDialog.isEdit ? 'Editar Usuário' : 'Novo Usuário'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="name"
                value={userDialog.user.name}
                onChange={handleFormChange}
                required
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={userDialog.user.email}
                onChange={handleFormChange}
                required
                margin="normal"
              />
            </Grid>
            
            {!userDialog.isEdit && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Senha"
                  name="password"
                  type="password"
                  value={userDialog.user.password}
                  onChange={handleFormChange}
                  required={!userDialog.isEdit}
                  margin="normal"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Função</InputLabel>
                <Select
                  name="role"
                  value={userDialog.user.role}
                  label="Função"
                  onChange={handleFormChange}
                >
                  <MenuItem value="superadmin">Administrador</MenuItem>
                  <MenuItem value="waiter">Garçom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {userDialog.isEdit && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userDialog.user.active}
                      onChange={handleFormChange}
                      name="active"
                    />
                  }
                  label="Usuário Ativo"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialog({ ...userDialog, open: false })}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveUser}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {userDialog.isEdit ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Performance Dialog */}
      <Dialog
        open={performanceDialog.open}
        onClose={() => setPerformanceDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Performance do Garçom</DialogTitle>
        <DialogContent dividers>
          {performanceDialog.user && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ mr: 2, width: 56, height: 56, bgcolor: 'primary.main' }}>
                  {getInitials(performanceDialog.user.name)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{performanceDialog.user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performanceDialog.user.email}
                  </Typography>
                </Box>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Pedidos Atendidos</Typography>
                    <Typography variant="h5">{performanceDialog.user.performance?.ordersServed || 0}</Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Tempo Médio de Atendimento</Typography>
                    <Typography variant="h5">
                      {performanceDialog.user.performance?.averageServiceTime 
                        ? `${performanceDialog.user.performance.averageServiceTime} min`
                        : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
              
              {performanceDialog.user.performance?.customerRatings && performanceDialog.user.performance.customerRatings.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Avaliações de Clientes
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon 
                        key={star} 
                        sx={{ 
                          color: star <= (
                            performanceDialog.user.performance.customerRatings.reduce((sum, rating) => sum + rating, 0) / 
                            performanceDialog.user.performance.customerRatings.length
                          ) ? 'warning.main' : 'grey.300' 
                        }} 
                      />
                    ))}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ({performanceDialog.user.performance.customerRatings.length} avaliações)
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPerformanceDialog({ open: false, user: null })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null, permanent: false })}
      >
        <DialogTitle>
          {deleteDialog.permanent ? 'Confirmar Exclusão Permanente' : 'Confirmar Desativação'}
        </DialogTitle>
        <DialogContent>
          {deleteDialog.permanent ? (
            <>
              <Typography color="error" variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                ATENÇÃO: Esta ação não pode ser desfeita!
              </Typography>
              <Typography>
                Tem certeza que deseja <strong>excluir permanentemente</strong> o usuário <strong>{deleteDialog.user?.name}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Todos os dados do usuário serão removidos definitivamente do sistema.
              </Typography>
            </>
          ) : (
            <>
              <Typography>
                Tem certeza que deseja desativar o usuário <strong>{deleteDialog.user?.name}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                A conta será desativada, mas os dados permanecerão no sistema.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null, permanent: false })}>
            Cancelar
          </Button>
          <Button 
            variant={deleteDialog.permanent ? 'contained' : 'text'}
            color="error" 
            onClick={handleDeleteConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {deleteDialog.permanent ? 'Excluir Permanentemente' : 'Desativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default UserManagement;

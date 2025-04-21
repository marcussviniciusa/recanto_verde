import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from 'axios';
import AppLayout from '../../components/layout/AppLayout';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Dialog states
  const [menuItemDialog, setMenuItemDialog] = useState({
    open: false,
    isEdit: false,
    item: {
      name: '',
      description: '',
      price: 0,
      category: 'main',
      available: true,
      image: '',
      preparationTime: 15,
      isSpecial: false,
      ingredients: []
    }
  });
  
  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null
  });
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // View details dialog
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    item: null
  });
  
  // Load menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/menu');
        setMenuItems(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError('Erro ao carregar itens do cardápio. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuItems();
  }, []);
  
  // Handle dialog open for new item
  const handleAddItem = () => {
    setMenuItemDialog({
      open: true,
      isEdit: false,
      item: {
        name: '',
        description: '',
        price: 0,
        category: 'main',
        available: true,
        image: '',
        preparationTime: 15,
        isSpecial: false,
        ingredients: []
      }
    });
  };
  
  // Handle dialog open for edit
  const handleEditItem = (item) => {
    // Clone the item to avoid direct state mutation
    const editItem = { ...item };
    
    // Ensure ingredients is an array
    if (!editItem.ingredients) {
      editItem.ingredients = [];
    }
    
    setMenuItemDialog({
      open: true,
      isEdit: true,
      item: editItem
    });
  };
  
  // Handle form change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setMenuItemDialog({
      ...menuItemDialog,
      item: {
        ...menuItemDialog.item,
        [name]: type === 'checkbox' ? checked : value
      }
    });
  };
  
  // Handle ingredients change
  const handleIngredientsChange = (e) => {
    const ingredientsString = e.target.value;
    const ingredientsArray = ingredientsString.split(',').map(item => item.trim());
    
    setMenuItemDialog({
      ...menuItemDialog,
      item: {
        ...menuItemDialog.item,
        ingredients: ingredientsArray
      }
    });
  };
  
  // Handle save menu item
  const handleSaveMenuItem = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const { item, isEdit } = menuItemDialog;
      
      // Validate form
      if (!item.name.trim() || !item.description.trim() || item.price <= 0) {
        setError('Por favor, preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }
      
      let response;
      
      if (isEdit) {
        // Update existing item
        response = await axios.put(`/api/menu/${item._id}`, item);
        
        // Update local state
        setMenuItems(menuItems.map(menuItem => 
          menuItem._id === item._id ? response.data : menuItem
        ));
        
        setSuccess('Item atualizado com sucesso!');
      } else {
        // Create new item
        response = await axios.post('/api/menu', item);
        
        // Add to local state
        setMenuItems([...menuItems, response.data]);
        
        setSuccess('Item adicionado com sucesso!');
      }
      
      // Close dialog
      setMenuItemDialog({
        ...menuItemDialog,
        open: false
      });
    } catch (err) {
      console.error('Error saving menu item:', err);
      setError('Erro ao salvar item. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Delete the item
      await axios.delete(`/api/menu/${deleteDialog.item._id}`);
      
      // Update local state
      setMenuItems(menuItems.filter(item => item._id !== deleteDialog.item._id));
      
      setSuccess('Item removido com sucesso!');
      
      // Close dialog
      setDeleteDialog({
        open: false,
        item: null
      });
    } catch (err) {
      console.error('Error deleting menu item:', err);
      setError('Erro ao remover item. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return `R$ ${parseFloat(value).toFixed(2)}`;
  };
  
  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Get category display name
  const getCategoryName = (category) => {
    switch (category) {
      case 'appetizer':
        return 'Entrada';
      case 'main':
        return 'Prato Principal';
      case 'dessert':
        return 'Sobremesa';
      case 'drink':
        return 'Bebida';
      case 'special':
        return 'Especial';
      default:
        return category;
    }
  };
  
  // Paginated items
  const paginatedItems = filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gerenciamento de Cardápio
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adicione, edite ou remova itens do cardápio do restaurante.
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
              placeholder="Pesquisar itens..."
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
              <InputLabel>Categoria</InputLabel>
              <Select
                value={filterCategory}
                label="Categoria"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">Todas Categorias</MenuItem>
                <MenuItem value="appetizer">Entradas</MenuItem>
                <MenuItem value="main">Pratos Principais</MenuItem>
                <MenuItem value="dessert">Sobremesas</MenuItem>
                <MenuItem value="drink">Bebidas</MenuItem>
                <MenuItem value="special">Especiais</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
            >
              Adicionar Item
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Menu items table */}
      <Paper elevation={2}>
        {loading && menuItems.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 4
          }}>
            <RestaurantMenuIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              Nenhum item encontrado. Tente ajustar a pesquisa ou adicionar novos itens.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 650 }} aria-label="menu items table">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell align="right">Preço</TableCell>
                    <TableCell align="center">Disponível</TableCell>
                    <TableCell align="right">Tempo de Preparo</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocalDiningIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="subtitle2">{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {item.description.length > 50 
                                ? `${item.description.substring(0, 50)}...` 
                                : item.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getCategoryName(item.category)} 
                          size="small"
                          color={
                            item.category === 'main' ? 'primary' :
                            item.category === 'special' ? 'secondary' :
                            'default'
                          }
                          variant={item.category !== 'main' && item.category !== 'special' ? 'outlined' : 'filled'}
                        />
                        {item.isSpecial && (
                          <Chip 
                            label="Especial" 
                            size="small" 
                            color="secondary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={item.available ? 'Sim' : 'Não'} 
                          color={item.available ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {item.preparationTime} min
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => setDetailsDialog({ open: true, item })}
                          title="Ver detalhes"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleEditItem(item)}
                          title="Editar"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, item })}
                          title="Remover"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredItems.length}
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
      
      {/* Menu Item Form Dialog */}
      <Dialog 
        open={menuItemDialog.open} 
        onClose={() => setMenuItemDialog({ ...menuItemDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {menuItemDialog.isEdit ? 'Editar Item' : 'Novo Item do Cardápio'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Item"
                name="name"
                value={menuItemDialog.item.name}
                onChange={handleFormChange}
                required
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Categoria</InputLabel>
                <Select
                  name="category"
                  value={menuItemDialog.item.category}
                  label="Categoria"
                  onChange={handleFormChange}
                >
                  <MenuItem value="appetizer">Entrada</MenuItem>
                  <MenuItem value="main">Prato Principal</MenuItem>
                  <MenuItem value="dessert">Sobremesa</MenuItem>
                  <MenuItem value="drink">Bebida</MenuItem>
                  <MenuItem value="special">Especial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Preço"
                name="price"
                type="number"
                value={menuItemDialog.item.price}
                onChange={handleFormChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tempo de Preparação (minutos)"
                name="preparationTime"
                type="number"
                value={menuItemDialog.item.preparationTime}
                onChange={handleFormChange}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                name="description"
                value={menuItemDialog.item.description}
                onChange={handleFormChange}
                required
                multiline
                rows={3}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL da Imagem"
                name="image"
                value={menuItemDialog.item.image || ''}
                onChange={handleFormChange}
                margin="normal"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ingredientes (separados por vírgula)"
                name="ingredients"
                value={menuItemDialog.item.ingredients ? menuItemDialog.item.ingredients.join(', ') : ''}
                onChange={handleIngredientsChange}
                margin="normal"
                placeholder="Ingrediente 1, Ingrediente 2, Ingrediente 3"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={menuItemDialog.item.available}
                    onChange={handleFormChange}
                    name="available"
                  />
                }
                label="Disponível"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={menuItemDialog.item.isSpecial}
                    onChange={handleFormChange}
                    name="isSpecial"
                  />
                }
                label="Item Especial"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuItemDialog({ ...menuItemDialog, open: false })}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveMenuItem}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {menuItemDialog.isEdit ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover o item <strong>{deleteDialog.item?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })}>
            Cancelar
          </Button>
          <Button 
            color="error" 
            onClick={handleDeleteConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Item Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes do Item</DialogTitle>
        <DialogContent>
          {detailsDialog.item && (
            <Box>
              {detailsDialog.item.image && (
                <Box sx={{ width: '100%', height: 200, overflow: 'hidden', borderRadius: 1, mb: 2 }}>
                  <img 
                    src={detailsDialog.item.image} 
                    alt={detailsDialog.item.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </Box>
              )}
              
              <Typography variant="h6">{detailsDialog.item.name}</Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 1 }}>
                <Chip 
                  label={getCategoryName(detailsDialog.item.category)} 
                  size="small"
                  color="primary"
                />
                
                {detailsDialog.item.isSpecial && (
                  <Chip 
                    label="Especial" 
                    size="small" 
                    color="secondary"
                  />
                )}
                
                <Chip 
                  label={detailsDialog.item.available ? 'Disponível' : 'Indisponível'} 
                  size="small"
                  color={detailsDialog.item.available ? 'success' : 'error'}
                />
              </Box>
              
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                {detailsDialog.item.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Preço</Typography>
                  <Typography variant="body1">{formatCurrency(detailsDialog.item.price)}</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Tempo de Preparo</Typography>
                  <Typography variant="body1">{detailsDialog.item.preparationTime} minutos</Typography>
                </Grid>
                
                {detailsDialog.item.ingredients && detailsDialog.item.ingredients.length > 0 && (
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Ingredientes</Typography>
                    <Typography variant="body1">
                      {detailsDialog.item.ingredients.join(', ')}
                    </Typography>
                  </Grid>
                )}
                
                {detailsDialog.item.popularity && (
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Popularidade
                    </Typography>
                    <Typography variant="body1">
                      {detailsDialog.item.popularity.orderCount || 0} pedidos realizados
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, item: null })}>
            Fechar
          </Button>
          {detailsDialog.item && (
            <Button 
              variant="contained" 
              onClick={() => {
                setDetailsDialog({ open: false, item: null });
                handleEditItem(detailsDialog.item);
              }}
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default MenuManagement;

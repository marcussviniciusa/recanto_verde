import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Grid,
  Card,
  CardMedia,
  IconButton,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import AppLayout from '../../components/layout/AppLayout';

const OrderCreation = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { emitNewOrder } = useSocket();
  
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Order items state
  const [orderItems, setOrderItems] = useState([]);
  const [specialRequest, setSpecialRequest] = useState('');
  
  // Item details dialog
  const [itemDetailsDialog, setItemDetailsDialog] = useState({
    open: false,
    item: null
  });
  
  // Special instructions dialog
  const [specialInstructionsDialog, setSpecialInstructionsDialog] = useState({
    open: false,
    itemIndex: null,
    instructions: ''
  });
  
  // Confirmation dialog
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // Load table and menu data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch table details
        const tableResponse = await axios.get(`/api/tables/${tableId}`);
        setTable(tableResponse.data);
        
        // Fetch menu items
        const menuResponse = await axios.get('/api/menu');
        const availableItems = menuResponse.data.filter(item => item.available);
        setMenuItems(availableItems);
        
        // Extract unique categories and sort them
        const categories = [...new Set(availableItems.map(item => item.category))];
        setMenuCategories(categories);
        
        // Default to first category if exists
        if (categories.length > 0) {
          setCurrentCategory(categories[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tableId]);
  
  // Handle category change
  const handleCategoryChange = (event, newCategory) => {
    setCurrentCategory(newCategory);
  };
  
  // Add item to order
  const handleAddItem = (menuItem) => {
    const existingItemIndex = orderItems.findIndex(item => item.menuItemId === menuItem._id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      setOrderItems([
        ...orderItems,
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          specialInstructions: '',
          category: menuItem.category
        }
      ]);
    }
  };
  
  // Remove item from order
  const handleRemoveItem = (index) => {
    const updatedItems = [...orderItems];
    
    if (updatedItems[index].quantity > 1) {
      // Decrease quantity
      updatedItems[index].quantity -= 1;
      setOrderItems(updatedItems);
    } else {
      // Remove item completely
      updatedItems.splice(index, 1);
      setOrderItems(updatedItems);
    }
  };
  
  // Delete item completely
  const handleDeleteItem = (index) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };
  
  // Open special instructions dialog
  const handleOpenSpecialInstructions = (index) => {
    setSpecialInstructionsDialog({
      open: true,
      itemIndex: index,
      instructions: orderItems[index].specialInstructions || ''
    });
  };
  
  // Save special instructions
  const handleSaveSpecialInstructions = () => {
    const { itemIndex, instructions } = specialInstructionsDialog;
    
    if (itemIndex !== null) {
      const updatedItems = [...orderItems];
      updatedItems[itemIndex].specialInstructions = instructions;
      setOrderItems(updatedItems);
    }
    
    setSpecialInstructionsDialog({
      open: false,
      itemIndex: null,
      instructions: ''
    });
  };
  
  // Show item details
  const handleShowItemDetails = (item) => {
    setItemDetailsDialog({
      open: true,
      item
    });
  };
  
  // Calculate total order amount
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  // Submit order
  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      setError('O pedido deve conter pelo menos um item.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare order data
      const orderData = {
        tableId,
        items: orderItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })),
        customerCount: table.capacity, // Default to table capacity
        specialRequests: specialRequest
      };
      
      // Create order
      const response = await axios.post('/api/orders', orderData);
      
      // Emit socket event for real-time updates
      emitNewOrder({
        orderId: response.data._id,
        tableId,
        tableNumber: table.tableNumber
      });
      
      // Show confirmation
      setConfirmationDialog({
        open: true,
        title: 'Pedido Realizado',
        message: 'Seu pedido foi enviado com sucesso para a cozinha.',
        onConfirm: () => {
          setConfirmationDialog({ ...confirmationDialog, open: false });
          navigate(`/table/${tableId}`);
        }
      });
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };
  
  // Filter menu items by category
  const filteredMenuItems = currentCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === currentCategory);

  if (loading && !table) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Table Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Novo Pedido - Mesa {table?.tableNumber || ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adicione itens ao pedido usando o cardápio abaixo
        </Typography>
      </Box>
      
      {/* Cart Preview Section - Mobile Only */}
      <Box sx={{ 
        display: { xs: 'flex', md: 'none' }, 
        mb: 2, 
        backgroundColor: 'primary.light',
        borderRadius: 1,
        p: 2,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ShoppingCartIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            {orderItems.length} {orderItems.length === 1 ? 'item' : 'itens'}
          </Typography>
        </Box>
        <Typography variant="subtitle1" fontWeight="bold">
          {formatCurrency(calculateTotal())}
        </Typography>
      </Box>
      
      {/* Main Content with Menu and Cart */}
      <Grid container spacing={2}>
        {/* Menu Section */}
        <Grid item xs={12} md={7} sx={{ mb: { xs: 2, md: 0 } }}>
          <Paper elevation={2} sx={{ height: '100%' }}>
            {/* Category Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={currentCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="menu categories"
              >
                <Tab label="Todos" value="all" />
                {menuCategories.map(category => (
                  <Tab 
                    key={category} 
                    label={category === 'appetizer' ? 'Entradas' : 
                           category === 'main' ? 'Pratos Principais' :
                           category === 'dessert' ? 'Sobremesas' :
                           category === 'drink' ? 'Bebidas' :
                           category === 'special' ? 'Especiais' : 
                           category} 
                    value={category} 
                  />
                ))}
              </Tabs>
            </Box>
            
            {/* Menu Items */}
            <Box sx={{ p: 2, height: { md: 'calc(100vh - 280px)' }, overflow: 'auto' }}>
              {filteredMenuItems.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                  <RestaurantMenuIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Nenhum item disponível nesta categoria
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredMenuItems.map(item => (
                    <Grid item xs={12} key={item._id}>
                      <Card variant="outlined" sx={{ display: 'flex', mb: 1 }}>
                        {item.image && (
                          <CardMedia
                            component="img"
                            sx={{ width: 80, height: 80, objectFit: 'cover' }}
                            image={item.image}
                            alt={item.name}
                          />
                        )}
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          flexGrow: 1,
                          p: 2
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" component="div">
                              {item.name}
                            </Typography>
                            <Typography variant="subtitle1" component="div">
                              {formatCurrency(item.price)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {item.description}
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 'auto'
                          }}>
                            <Chip 
                              size="small"
                              label={item.category === 'appetizer' ? 'Entrada' : 
                                    item.category === 'main' ? 'Prato Principal' :
                                    item.category === 'dessert' ? 'Sobremesa' :
                                    item.category === 'drink' ? 'Bebida' :
                                    item.category === 'special' ? 'Especial' : 
                                    item.category}
                              color="primary"
                              variant="outlined"
                            />
                            <Box>
                              <IconButton 
                                size="small" 
                                onClick={() => handleShowItemDetails(item)}
                                color="secondary"
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleAddItem(item)}
                                color="primary"
                              >
                                <AddCircleIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Order Summary Section */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3, height: { md: 'calc(100vh - 200px)' }, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ShoppingCartIcon sx={{ mr: 1 }} />
              Resumo do Pedido
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Order Items List */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              {orderItems.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  p: 4
                }}>
                  <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary" align="center">
                    Seu pedido está vazio.
                  </Typography>
                  <Typography color="text.secondary" align="center">
                    Adicione itens do cardápio para começar.
                  </Typography>
                </Box>
              ) : (
                <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
                  {orderItems.map((item, index) => (
                    <ListItem
                      key={`${item.menuItemId}-${index}`}
                      alignItems="flex-start"
                      divider={index < orderItems.length - 1}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleDeleteItem(index)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {item.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, mr: 4 }}>
                              <Typography variant="body2" component="span">
                                {formatCurrency(item.price)} x {item.quantity}
                              </Typography>
                              <Typography variant="body2" component="span" fontWeight="bold">
                                {formatCurrency(item.price * item.quantity)}
                              </Typography>
                            </Box>
                            
                            {item.specialInstructions && (
                              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                                Observações: {item.specialInstructions}
                              </Typography>
                            )}
                            
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleRemoveItem(index)} 
                                disabled={item.quantity <= 1}
                                color="primary"
                              >
                                <RemoveCircleIcon fontSize="small" />
                              </IconButton>
                              <Typography sx={{ mx: 1 }}>
                                {item.quantity}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => handleAddItem(menuItems.find(mi => mi._id === item.menuItemId))}
                                color="primary"
                              >
                                <AddCircleIcon fontSize="small" />
                              </IconButton>
                              
                              <Button 
                                size="small" 
                                onClick={() => handleOpenSpecialInstructions(index)}
                                sx={{ ml: 1 }}
                              >
                                {item.specialInstructions ? 'Editar Obs.' : 'Adicionar Obs.'}
                              </Button>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
            
            {/* Special Requests for the entire order */}
            <TextField
              label="Observações Gerais do Pedido"
              multiline
              rows={2}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
            />
            
            {/* Order Total */}
            <Box sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(calculateTotal())}
                </Typography>
              </Box>
            </Box>
            
            {/* Submit Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={orderItems.length === 0 || loading}
              onClick={handleSubmitOrder}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {loading ? 'Enviando...' : 'Confirmar Pedido'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Item Details Dialog */}
      <Dialog open={itemDetailsDialog.open} onClose={() => setItemDetailsDialog({ ...itemDetailsDialog, open: false })}>
        <DialogTitle>Detalhes do Item</DialogTitle>
        <DialogContent>
          {itemDetailsDialog.item && (
            <Box>
              {itemDetailsDialog.item.image && (
                <Box sx={{ width: '100%', textAlign: 'center', mb: 2 }}>
                  <img 
                    src={itemDetailsDialog.item.image} 
                    alt={itemDetailsDialog.item.name} 
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} 
                  />
                </Box>
              )}
              
              <Typography variant="h6" gutterBottom>
                {itemDetailsDialog.item.name}
              </Typography>
              
              <Typography variant="body1" paragraph>
                {itemDetailsDialog.item.description}
              </Typography>
              
              {itemDetailsDialog.item.ingredients && itemDetailsDialog.item.ingredients.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Ingredientes:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {itemDetailsDialog.item.ingredients.join(', ')}
                  </Typography>
                </>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="subtitle1">
                  Preço:
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {formatCurrency(itemDetailsDialog.item.price)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tempo de Preparo:
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {itemDetailsDialog.item.preparationTime} minutos
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDetailsDialog({ ...itemDetailsDialog, open: false })}>
            Fechar
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              handleAddItem(itemDetailsDialog.item);
              setItemDetailsDialog({ ...itemDetailsDialog, open: false });
            }}
          >
            Adicionar ao Pedido
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Special Instructions Dialog */}
      <Dialog 
        open={specialInstructionsDialog.open} 
        onClose={() => setSpecialInstructionsDialog({ ...specialInstructionsDialog, open: false })}
      >
        <DialogTitle>Observações do Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Observações especiais"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={specialInstructionsDialog.instructions}
            onChange={(e) => setSpecialInstructionsDialog({ 
              ...specialInstructionsDialog, 
              instructions: e.target.value 
            })}
            placeholder="Ex: Sem cebola, ponto médio, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpecialInstructionsDialog({ ...specialInstructionsDialog, open: false })}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveSpecialInstructions}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog.open} onClose={() => setConfirmationDialog({ ...confirmationDialog, open: false })}>
        <DialogTitle>{confirmationDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmationDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => confirmationDialog.onConfirm && confirmationDialog.onConfirm()} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default OrderCreation;

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';

const SplitPaymentDialog = ({
  open,
  onClose,
  divisions,
  totalAmount,
  onRequestFullPayment,
  onRequestDivisionPayment,
  loading,
  formatCurrency
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Solicitar Pagamento</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          Selecione uma opção de pagamento:
        </Typography>
        
        <List>
          {/* Opção de pagamento completo */}
          <ListItem 
            button 
            onClick={onRequestFullPayment} 
            disabled={loading}
          >
            <ListItemIcon>
              <PaymentIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Pagamento Completo" 
              secondary={`Valor total: ${formatCurrency(totalAmount)}`} 
            />
            {loading && <CircularProgress size={24} />}
          </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, pl: 2 }}>
            Pagamentos Individuais:
          </Typography>
          
          {/* Lista de divisões para pagamento individual */}
          {divisions.map((division, index) => (
            <ListItem 
              button 
              key={index} 
              onClick={() => onRequestDivisionPayment(index)}
              disabled={division.paymentStatus === 'paid' || loading}
            >
              <ListItemIcon>
                <Avatar>{index + 1}</Avatar>
              </ListItemIcon>
              <ListItemText 
                primary={division.name} 
                secondary={
                  <>
                    {`Valor: ${formatCurrency(division.totalAmount || 0)}`}
                    {division.paymentStatus && (
                      <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                        <Chip 
                          size="small" 
                          label={division.paymentStatus === 'pending' ? 'Pagamento Pendente' : 'Pago'} 
                          color={division.paymentStatus === 'pending' ? 'warning' : 'success'}
                        />
                      </Box>
                    )}
                  </>
                } 
              />
              {loading && index === division.processingIndex && <CircularProgress size={24} />}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SplitPaymentDialog;

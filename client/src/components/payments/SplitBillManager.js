import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const SplitBillManager = ({ 
  enabled, 
  onToggleEnabled,
  divisions, 
  onUpdateDivisions,
  totalAmount,
  method,
  onMethodChange,
  formatCurrency
}) => {
  const [localDivisions, setLocalDivisions] = useState(divisions || []);
  
  useEffect(() => {
    setLocalDivisions(divisions || []);
  }, [divisions]);
  
  useEffect(() => {
    // Recalcular valores quando o método ou valor total mudar
    if (localDivisions.length > 0) {
      const calculatedDivisions = calculateDivisionAmounts();
      setLocalDivisions(calculatedDivisions);
      // Propagar mudanças para o componente pai
      onUpdateDivisions(calculatedDivisions);
    }
  }, [method, totalAmount]);
  
  // Calcular valores para cada divisão baseado no método selecionado
  const calculateDivisionAmounts = () => {
    if (localDivisions.length === 0) return [];
    
    if (method === 'equal') {
      // Divisão igual entre todos
      return localDivisions.map(division => ({
        ...division,
        percentage: 100 / localDivisions.length,
        totalAmount: parseFloat((totalAmount / localDivisions.length).toFixed(2))
      }));
    } 
    else if (method === 'custom') {
      // Divisão percentual personalizada
      return localDivisions.map(division => ({
        ...division,
        totalAmount: parseFloat((totalAmount * (division.percentage / 100)).toFixed(2))
      }));
    }
    else if (method === 'byItem') {
      // Divisão por item (este caso será tratado pelo componente pai)
      return localDivisions;
    }
    
    return localDivisions;
  };
  
  // Adicionar nova divisão
  const handleAddDivision = () => {
    const newDivision = {
      name: `Cliente ${localDivisions.length + 1}`,
      items: [],
      percentage: 100 / (localDivisions.length + 1),
      totalAmount: 0
    };
    
    // Recalcular as porcentagens para manter igual
    const updatedDivisions = localDivisions.map(div => ({
      ...div,
      percentage: 100 / (localDivisions.length + 1)
    }));
    
    const newDivisions = [...updatedDivisions, newDivision];
    setLocalDivisions(newDivisions);
    onUpdateDivisions(newDivisions);
  };
  
  // Remover divisão
  const handleRemoveDivision = (index) => {
    if (localDivisions.length <= 1) return;
    
    const newDivisions = [...localDivisions];
    newDivisions.splice(index, 1);
    
    // Recalcular as porcentagens
    const updatedDivisions = newDivisions.map(div => ({
      ...div,
      percentage: 100 / newDivisions.length
    }));
    
    setLocalDivisions(updatedDivisions);
    onUpdateDivisions(updatedDivisions);
  };
  
  // Atualizar nome da divisão
  const handleUpdateDivisionName = (index, name) => {
    const newDivisions = [...localDivisions];
    newDivisions[index] = {
      ...newDivisions[index],
      name
    };
    setLocalDivisions(newDivisions);
    onUpdateDivisions(newDivisions);
  };
  
  // Atualizar porcentagem da divisão
  const handleUpdateDivisionPercentage = (index, percentage) => {
    const newPercentage = parseInt(percentage) || 0;
    const newDivisions = [...localDivisions];
    newDivisions[index] = {
      ...newDivisions[index],
      percentage: newPercentage
    };
    
    // Calcular o valor com base na porcentagem
    newDivisions[index].totalAmount = parseFloat((totalAmount * (newPercentage / 100)).toFixed(2));
    
    setLocalDivisions(newDivisions);
    onUpdateDivisions(newDivisions);
  };
  
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            color="primary"
          />
        }
        label="Habilitar divisão de conta"
        sx={{ mb: 2 }}
      />
      
      {enabled && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel>Método de Divisão</InputLabel>
            <Select
              value={method}
              onChange={(e) => onMethodChange(e.target.value)}
              label="Método de Divisão"
            >
              <MenuItem value="equal">Divisão Igual</MenuItem>
              <MenuItem value="custom">Personalizado (por %)</MenuItem>
              <MenuItem value="byItem">Por Item do Pedido</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Divisões de Conta
          </Typography>
          
          <List>
            {localDivisions.map((division, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Avatar>{index + 1}</Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TextField
                        variant="standard"
                        value={division.name}
                        onChange={(e) => handleUpdateDivisionName(index, e.target.value)}
                        sx={{ mr: 2 }}
                      />
                      {method === 'custom' && (
                        <TextField
                          type="number"
                          variant="outlined"
                          size="small"
                          InputProps={{
                            endAdornment: <Typography>%</Typography>,
                            inputProps: { min: 1, max: 100, step: 1 }
                          }}
                          value={division.percentage || 0}
                          onChange={(e) => handleUpdateDivisionPercentage(index, e.target.value)}
                          sx={{ width: '80px' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="primary">
                        Valor: {formatCurrency(division.totalAmount || 0)}
                      </Typography>
                      {division.paymentStatus && (
                        <Chip 
                          size="small" 
                          label={division.paymentStatus === 'pending' ? 'Pagamento Pendente' : 'Pago'} 
                          color={division.paymentStatus === 'pending' ? 'warning' : 'success'}
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => handleRemoveDivision(index)}
                    disabled={localDivisions.length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddDivision}
            sx={{ mt: 2 }}
            fullWidth
          >
            Adicionar Divisão
          </Button>
          
          {method === 'byItem' && (
            <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
              Nota: No modo "Por Item", você deve associar os itens a cada cliente ao fazer o pedido.
            </Typography>
          )}
          
          {method === 'custom' && (
            <Typography variant="body2" color={Math.abs(localDivisions.reduce((sum, div) => sum + (div.percentage || 0), 0) - 100) > 1 ? 'error' : 'primary'} sx={{ mt: 2 }}>
              Total: {localDivisions.reduce((sum, div) => sum + (div.percentage || 0), 0)}% (ideal: 100%)
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default SplitBillManager;

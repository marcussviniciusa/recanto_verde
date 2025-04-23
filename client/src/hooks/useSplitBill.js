import { useState, useEffect } from 'react';

// Hook personalizado para gerenciar a lógica de divisão de conta
const useSplitBill = (initialTotalAmount = 0, initialDivisions = [], initialMethod = 'equal') => {
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [divisions, setDivisions] = useState(initialDivisions.length > 0 ? initialDivisions : [{
    name: 'Cliente 1',
    items: [],
    percentage: 100,
    totalAmount: initialTotalAmount
  }]);
  const [method, setMethod] = useState(initialMethod);
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount);

  // Quando o valor total mudar, recalcular as divisões
  useEffect(() => {
    if (divisions.length > 0) {
      const calculatedDivisions = calculateDivisionAmounts();
      setDivisions(calculatedDivisions);
    }
  }, [totalAmount, method]);

  // Recalcular quando as divisões iniciais mudarem
  useEffect(() => {
    if (initialDivisions.length > 0) {
      setDivisions(initialDivisions);
    }
  }, [initialDivisions]);

  // Calcular valores para cada divisão baseado no método selecionado
  const calculateDivisionAmounts = () => {
    if (divisions.length === 0) return [];
    
    if (method === 'equal') {
      // Divisão igual entre todos
      return divisions.map(division => ({
        ...division,
        percentage: 100 / divisions.length,
        totalAmount: parseFloat((totalAmount / divisions.length).toFixed(2))
      }));
    } 
    else if (method === 'custom') {
      // Divisão percentual personalizada
      return divisions.map(division => ({
        ...division,
        totalAmount: parseFloat((totalAmount * (division.percentage / 100)).toFixed(2))
      }));
    }
    else if (method === 'byItem') {
      // Divisão por item (este caso será tratado pelo componente pai)
      return divisions;
    }
    
    return divisions;
  };

  // Adicionar nova divisão
  const addDivision = () => {
    const newDivision = {
      name: `Cliente ${divisions.length + 1}`,
      items: [],
      percentage: 100 / (divisions.length + 1),
      totalAmount: 0
    };
    
    // Recalcular as porcentagens para manter igual
    const updatedDivisions = divisions.map(div => ({
      ...div,
      percentage: 100 / (divisions.length + 1)
    }));
    
    setDivisions([...updatedDivisions, newDivision]);
  };

  // Remover divisão
  const removeDivision = (index) => {
    if (divisions.length <= 1) return;
    
    const newDivisions = [...divisions];
    newDivisions.splice(index, 1);
    
    // Recalcular as porcentagens para manter igual
    const updatedDivisions = newDivisions.map(div => ({
      ...div,
      percentage: 100 / newDivisions.length
    }));
    
    setDivisions(updatedDivisions);
  };

  // Atualizar divisões
  const updateDivision = (index, changes) => {
    const newDivisions = [...divisions];
    newDivisions[index] = {
      ...newDivisions[index],
      ...changes
    };
    
    // Se estiver atualizando a porcentagem, calcular o valor
    if (changes.percentage !== undefined && method === 'custom') {
      newDivisions[index].totalAmount = parseFloat((totalAmount * (changes.percentage / 100)).toFixed(2));
    }
    
    setDivisions(newDivisions);
  };

  return {
    splitEnabled,
    setSplitEnabled,
    divisions,
    setDivisions,
    method,
    setMethod,
    totalAmount,
    setTotalAmount,
    addDivision,
    removeDivision,
    updateDivision,
    calculateDivisionAmounts
  };
};

export default useSplitBill;

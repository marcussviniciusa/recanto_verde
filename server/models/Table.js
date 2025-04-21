const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: [true, 'Número da mesa é obrigatório'],
    unique: true
  },
  capacity: {
    type: Number,
    required: [true, 'Capacidade da mesa é obrigatória'],
    min: 1
  },
  originalCapacity: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  assignedWaiters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  splitBills: {
    enabled: { 
      type: Boolean, 
      default: false 
    },
    divisions: [{
      name: String,
      waiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem'
      }]
    }]
  },
  occupiedAt: {
    type: Date,
    default: null
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  section: {
    type: String,
    default: 'main'
  },
  isJoined: {
    type: Boolean,
    default: false
  },
  joinedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }],
  isVirtual: {
    type: Boolean,
    default: false
  },
  parentTable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    default: null
  }
});

TableSchema.virtual('statusColor').get(function() {
  switch(this.status) {
    case 'available':
      return 'green';
    case 'occupied':
      return 'yellow';
    case 'reserved':
      return 'orange';
    default:
      return 'gray';
  }
});

// Virtual para compatibilidade com código existente
// Para permitir populate nas propriedades virtuais, precisamos definir as opções ref, localField e foreignField
TableSchema.virtual('assignedWaiter', {
  ref: 'User',
  localField: 'assignedWaiters',
  foreignField: '_id',
  justOne: true // Retorna apenas o primeiro item do array
});

// Middleware para garantir que modificações no status sejam aplicadas a todas as mesas relacionadas
TableSchema.pre('save', async function(next) {
  // Apenas prosseguir se o status foi modificado
  if (!this.isModified('status')) {
    return next();
  }
  
  try {
    const status = this.status;
    console.log(`Pre-save middleware: Mesa ${this.tableNumber} mudou para status ${status}`);
    
    // Se for uma mesa principal com mesas secundárias vinculadas
    if (this.isJoined && this.joinedWith && this.joinedWith.length > 0) {
      console.log(`Pre-save: Propagando status ${status} para ${this.joinedWith.length} mesas relacionadas`);
      
      // Usando o model diretamente para evitar loop infinito
      const Table = this.constructor;
      
      // Atualizar todas as mesas secundárias
      for (const relatedId of this.joinedWith) {
        // Não usamos save() para evitar loop de middleware, usamos updateOne
        await Table.updateOne(
          { _id: relatedId },
          { 
            status: status,
            occupiedAt: status === 'occupied' ? Date.now() : null
          }
        );
        console.log(`Pre-save: Mesa secundária ${relatedId} atualizada para ${status}`);
      }
    }
    
    // Se for uma mesa secundária (isVirtual=true)
    if (this.isVirtual && this.parentTable) {
      console.log(`Pre-save: Mesa virtual ${this.tableNumber} - propagando status ${status} para mesa principal e outras relacionadas`);
      
      const Table = this.constructor;
      
      // Buscar a mesa principal
      const parentTable = await Table.findById(this.parentTable);
      if (parentTable) {
        // Atualizar a mesa principal
        parentTable.status = status;
        if (status === 'occupied') {
          parentTable.occupiedAt = Date.now();
        } else if (status === 'available') {
          parentTable.occupiedAt = null;
        }
        
        // Salvar a mesa principal, que vai automaticamente propagar para as outras mesas secundárias
        // por meio do próprio middleware pre-save dela
        await parentTable.save();
        console.log(`Pre-save: Mesa principal ${parentTable.tableNumber} atualizada para ${status}`);
      }
    }
    
    next();
  } catch (error) {
    console.error('Erro no middleware pre-save da mesa:', error);
    next(error);
  }
});

module.exports = mongoose.model('Table', TableSchema);

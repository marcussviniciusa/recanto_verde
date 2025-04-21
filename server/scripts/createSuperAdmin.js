const path = require('path');
const dotenvPath = path.resolve(__dirname, '../.env');
console.log('Carregando .env de:', dotenvPath);
require('dotenv').config({ path: dotenvPath });

// Verificar se as variáveis foram carregadas
console.log('MONGO_URI carregada:', process.env.MONGO_URI ? 'Sim' : 'Não');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Certificar-se de que o modelo de usuário está usando o mesmo schema que o resto da aplicação
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'waiter'],
    default: 'waiter'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    await mongoose.connect(mongoURI);
    
    console.log('MongoDB conectado...');
  } catch (err) {
    console.error('Erro na conexão com o MongoDB:', err.message);
    process.exit(1);
  }
};

// Função para criar o superadmin
const createSuperAdmin = async (name, email, password) => {
  try {
    // Verificar se já existe um usuário com este email
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log(`\nO usuário com email ${email} já existe!`);
      process.exit(0);
    }
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Criar o superadmin
    const superAdmin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'superadmin',
      active: true
    });
    
    // Salvar no banco de dados
    await superAdmin.save();
    
    console.log(`\nSuperadmin criado com sucesso!`);
    console.log(`Nome: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Role: superadmin`);
    
  } catch (err) {
    console.error('Erro ao criar superadmin:', err.message);
  }
  
  process.exit(0);
};

// Função para solicitar os dados do superadmin
const promptSuperAdmin = () => {
  console.log('\n===== Criação de Superadmin para o Recanto Verde =====\n');
  
  rl.question('Nome completo: ', (name) => {
    rl.question('Email: ', (email) => {
      rl.question('Senha: ', (password) => {
        rl.question('Confirme a senha: ', (confirmPassword) => {
          if (password !== confirmPassword) {
            console.log('\nAs senhas não coincidem. Tente novamente.');
            rl.close();
            process.exit(1);
          }
          
          // Validar os dados
          if (!name || !email || !password) {
            console.log('\nTodos os campos são obrigatórios. Tente novamente.');
            rl.close();
            process.exit(1);
          }
          
          // Validar formato de email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            console.log('\nFormato de email inválido. Tente novamente.');
            rl.close();
            process.exit(1);
          }
          
          // Validar senha (mínimo 6 caracteres)
          if (password.length < 6) {
            console.log('\nA senha deve ter no mínimo 6 caracteres. Tente novamente.');
            rl.close();
            process.exit(1);
          }
          
          createSuperAdmin(name, email, password);
          rl.close();
        });
      });
    });
  });
};

// Iniciar o processo
connectDB().then(() => {
  promptSuperAdmin();
});

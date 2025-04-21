# Scripts de Administração - Recanto Verde

Este diretório contém scripts úteis para a administração do sistema Recanto Verde.

## Script de Criação de Superadmin

O script `createSuperAdmin.js` permite criar um usuário com privilégios de superadmin no sistema. Este usuário terá acesso completo a todas as funcionalidades de administração.

### Como usar

Execute o seguinte comando na pasta raiz do servidor:

```bash
npm run create-admin
```

O script solicitará as seguintes informações:
- Nome completo
- Email
- Senha (mínimo 6 caracteres)
- Confirmação da senha

Após a confirmação, o usuário superadmin será criado no banco de dados e você poderá fazer login no sistema com estas credenciais.

### Requisitos

- MongoDB deve estar em execução e acessível
- As variáveis de ambiente devem estar configuradas corretamente (arquivo .env)

### Observações

- O script verifica se já existe um usuário com o email fornecido
- As senhas são armazenadas de forma segura utilizando hash bcrypt
- O script realiza validações para garantir que os dados inseridos sejam válidos

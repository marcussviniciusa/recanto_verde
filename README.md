# Recanto Verde - Sistema de Restaurante

## Instruções para Deploy com Portainer e Traefik

Este guia explica como fazer deploy da aplicação Recanto Verde em uma VPS que já possui Portainer, Traefik e MongoDB configurados.

### Pré-requisitos

- Acesso à VPS com Portainer, Traefik e MongoDB instalados
- Conta no Docker Hub para armazenar as imagens
- Domínio configurado para apontar para o IP da VPS

### Passos para o Deploy

#### 1. Construir e enviar as imagens para o Docker Hub

```bash
# Construir imagem do Frontend
cd client
docker build -t seu-usuario/recanto-verde-frontend:latest .
docker push seu-usuario/recanto-verde-frontend:latest

# Construir imagem do Backend
cd ../server
docker build -t seu-usuario/recanto-verde-backend:latest .
docker push seu-usuario/recanto-verde-backend:latest
```

#### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar as configurações conforme necessário
nano .env
```

Principais variáveis a serem configuradas:
- `DOCKER_USER`: Seu usuário no Docker Hub
- `DOMAIN`: Domínio para a aplicação (ex: recanto.seudominio.com)
- `MONGO_URI`: URI de conexão com o MongoDB existente na VPS

#### 3. Deploy usando Portainer

1. Acesse o Portainer da sua VPS (geralmente em https://portainer.seudominio.com)
2. Navegue até "Stacks" e clique em "Add stack"
3. Dê um nome ao stack (ex: "recanto-verde")
4. Faça upload do arquivo `docker-compose.yml` ou cole seu conteúdo
5. Faça upload do arquivo `.env` ou adicione as variáveis de ambiente manualmente
6. Clique em "Deploy the stack"

#### 4. Verificação

Após o deploy, verifique se todos os serviços estão funcionando:

1. Frontend: acesse https://recanto.seudominio.com
2. API: teste a conexão em https://api.recanto.seudominio.com/api/users/me (requer autenticação)

### Troubleshooting

Se encontrar problemas:

1. Verifique os logs dos contêineres no Portainer
2. Confirme se as variáveis de ambiente estão configuradas corretamente
3. Verifique se o Traefik está gerando os certificados SSL corretamente
4. Confirme se a conexão com o MongoDB está funcionando

### Configuração do Ambiente

- Frontend: React.js servido via Nginx
- Backend: Node.js/Express
- Banco de dados: MongoDB (existente na VPS)
- Proxy reverso: Traefik (existente na VPS)
- Orquestração: Portainer (existente na VPS)

### Manutenção

Para atualizar a aplicação:

1. Construa novas imagens com as alterações
2. Faça push para o Docker Hub
3. No Portainer, acesse o stack "recanto-verde"
4. Clique em "Redeploy" para aplicar as atualizações

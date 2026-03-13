# Backend - Localiza Banricard

Backend API para o sistema de localização de estabelecimentos (restaurantes, postos, farmácias) que aceitam Banricard Vale Refeição.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados relacional

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 14+ instalado e rodando
- npm ou yarn

## 🔧 Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:
- `DATABASE_URL`: URL de conexão com PostgreSQL
- `GOOGLE_MAPS_API_KEY`: Chave da API do Google Maps

3. **Criar banco de dados:**
```bash
# Conecte-se ao PostgreSQL e crie o banco
createdb localiza_banricard

# Ou via psql:
psql -U postgres
CREATE DATABASE localiza_banricard;
```

4. **Gerar Prisma Client:**
```bash
npm run prisma:generate
```

5. **Executar migrations:**
```bash
npm run prisma:migrate
```

6. **(Opcional) Popular banco com dados de teste:**
```bash
npm run prisma:seed
```

## 🗄️ Banco de Dados

### Schema

O banco possui duas tabelas principais:

- **restaurants**: Armazena os estabelecimentos (restaurantes, postos, farmácias, etc.)
- **update_history**: Histórico de atualizações (futuro)

### Comandos Prisma

```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar nova migration
npm run prisma:migrate

# Abrir Prisma Studio (interface visual)
npm run prisma:studio

# Popular banco com dados de teste
npm run prisma:seed

# Resetar banco (cuidado: apaga todos os dados!)
npm run db:reset
```

## 📁 Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   └── seed.js            # Script para popular banco
├── src/
│   ├── server.js          # Entry point (a criar)
│   ├── routes/           # Rotas da API (a criar)
│   ├── controllers/      # Controllers (a criar)
│   ├── services/         # Serviços (a criar)
│   └── lib/
│       └── prisma.js     # Cliente Prisma (a criar)
├── .env                   # Variáveis de ambiente
├── .env.example          # Exemplo de variáveis
├── package.json
└── README.md
```

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `GOOGLE_MAPS_API_KEY` | Chave da API Google Maps | `AIza...` |

## 📝 Status do Projeto

1. ✅ Banco de dados configurado
2. ✅ Estrutura da API (Express) criada
3. ✅ Controllers implementados
4. ✅ Rotas criadas
5. ✅ Geocodificação integrada

## 🚀 Como Executar

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar variáveis de ambiente:**
Crie o arquivo `.env` (veja `SETUP.md`)

3. **Iniciar servidor:**
```bash
# Modo desenvolvimento (com watch)
npm run dev

# Modo produção
npm start
```

4. **Acessar API:**
- Documentação: http://localhost:3000/
- Health check: http://localhost:3000/health
- Estabelecimentos: http://localhost:3000/api/restaurants

## 🐛 Troubleshooting

### Erro de conexão com banco
- Verifique se PostgreSQL está rodando
- Confirme a `DATABASE_URL` no `.env`
- Teste conexão: `psql $DATABASE_URL`

### Erro ao executar migrations
- Certifique-se de que o banco existe
- Verifique permissões do usuário
- Tente resetar: `npm run db:reset`

### Prisma Client não encontrado
- Execute: `npm run prisma:generate`

## 📚 Documentação

Consulte a pasta `../docs/` para documentação completa do projeto.

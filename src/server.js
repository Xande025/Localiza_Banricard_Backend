import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import restaurantsRoutes from './routes/restaurants.js';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requisições (desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rotas
app.use('/api/restaurants', restaurantsRoutes);

// Rota raiz - Informações da API
app.get('/', (req, res) => {
  res.json({
    message: 'API Localiza Banricard - Estabelecimentos que aceitam Banricard Vale Refeição',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      restaurants: {
        list: 'GET /api/restaurants',
        getById: 'GET /api/restaurants/:id',
        create: 'POST /api/restaurants',
        update: 'PUT /api/restaurants/:id',
        delete: 'DELETE /api/restaurants/:id',
        cities: 'GET /api/restaurants/cities',
        neighborhoods: 'GET /api/restaurants/neighborhoods?city=Porto Alegre',
        regions: 'GET /api/restaurants/regions'
      }
    },
    filters: {
      city: '?city=Porto Alegre',
      neighborhood: '?neighborhood=Centro',
      region: '?region=Metropolitana',
      search: '?search=restaurante',
      verified: '?verified=true',
      pagination: '?limit=10&offset=0'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Tratamento de erros globais
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API disponível em: http://localhost:${PORT}`);
  console.log(`📚 Documentação: http://localhost:${PORT}/`);
});

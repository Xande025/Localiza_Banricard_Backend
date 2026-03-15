import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import restaurantsRoutes from './routes/restaurants.js';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS - permite múltiplas origens (localhost e Vercel)
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'https://localiza-banricard.vercel.app', // URL do Vercel
  'https://localiza-banricard.vercel.app/', // URL do Vercel com barra
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove valores undefined/null

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    // Remove barra no final para comparação
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const normalizedAllowed = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);
    
    if (normalizedAllowed.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origem:', origin);
      console.log('Origens permitidas:', allowedOrigins);
      // Retorna false ao invés de lançar erro para evitar erro não tratado
      callback(null, false);
    }
  },
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

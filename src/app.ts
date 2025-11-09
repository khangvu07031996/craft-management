import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import swaggerSpec from './config/swagger';
import { requestLogger } from './middleware/logger.middleware';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { setupDatabase } from './database/setup';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'User Management API Docs',
}));

// Swagger JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to User Management API',
    version: '1.0.0',
    documentation: {
      swagger: '/api-docs',
      openapi_json: '/api-docs.json',
    },
    endpoints: {
      health: '/api/health',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        profile: '/api/auth/me',
      },
      users: '/api/users',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Setup database tables
    await setupDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      console.log(`📚 Swagger Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`📝 API Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;


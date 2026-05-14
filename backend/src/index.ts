import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import apiRoutes from './routes/api.routes.js';


import path from 'path';
import { fileURLToPath } from 'url';

// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI("YOUR_API_KEY");

// async function listModels() {
//   const models = await genAI.listModels();
//   console.log(models);
// }

// listModels();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();

// CORS — allow the local Vite dev frontend (and any origin in dev). Tighten
// `origin` to a list of trusted domains before deploying to production.
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser callers (curl, Postman, server-to-server) have no Origin header.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());

// Verify Database Connection
async function checkDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (err: any) {
    console.error('❌ Database connection failed:', err.message);
  }
}
checkDatabase();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Catalyst Discovery API',
      version: '1.0.0',
      description: 'Production-grade backend for catalyst discovery and experiment feedback loops.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Catalyst Backend running on port ${PORT}`);
  });
}



export default app;

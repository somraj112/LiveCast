import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import { categoryRouter, creatorStreamRouter, publicStreamRouter } from './routes/stream.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/streams', publicStreamRouter);
app.use('/api/v1/creator/streams', creatorStreamRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

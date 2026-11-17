import 'dotenv/config.js';
import app from './app.js';
import { createServer } from 'node:http';
import { createRealtimeServer } from './realtime/index.js';

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = createServer(app);
const io = createRealtimeServer(server);
server.listen(PORT, () => {
  console.log(
    `LiveCast server running on http://localhost:${PORT} in ${NODE_ENV} mode`
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  io.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  io.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

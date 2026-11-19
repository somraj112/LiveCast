import 'dotenv/config';
import { createServer } from 'node:http';
import { loadEnvironment } from './config/environment.js';
import { logger, errorMetadata } from './config/logger.js';
import { connectInfrastructure } from './infrastructure/store.js';

async function start() {
  const config = loadEnvironment();
  const store = await connectInfrastructure();
  const [{ default: app }, { default: prisma }, { createRealtimeServer }, { markDraining }] = await Promise.all([
    import('./app.js'), import('./config/db.js'), import('./realtime/index.js'), import('./routes/health.js'),
  ]);
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  const server = createServer(app);
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  const io = createRealtimeServer(server, { store });
  app.set('realtime', io);
  let stopping = false;
  async function stop(signal, exitCode = 0) {
    if (stopping) return;
    stopping = true;
    markDraining();
    logger.info({ signal }, 'Draining server');
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    await new Promise((resolve) => io.close(resolve));
    await io.drainPresence();
    await store.close();
    await prisma.$disconnect();
    clearTimeout(deadline);
    process.exit(exitCode);
  }
  process.on('SIGTERM', () => { void stop('SIGTERM'); });
  process.on('SIGINT', () => { void stop('SIGINT'); });
  process.on('unhandledRejection', (error) => { logger.fatal({ error: errorMetadata(error) }, 'Unhandled rejection'); void stop('unhandledRejection', 1); });
  process.on('uncaughtException', (error) => { logger.fatal({ error: errorMetadata(error) }, 'Uncaught exception'); void stop('uncaughtException', 1); });
  server.listen(config.port, '0.0.0.0', () => logger.info({ port: config.port, production: config.production }, 'LiveCast API ready'));
}

start().catch((error) => {
  logger.fatal({ error: errorMetadata(error), configuration: error.message?.startsWith('Invalid server configuration:') ? error.message : undefined }, 'Startup failed');
  process.exit(1);
});

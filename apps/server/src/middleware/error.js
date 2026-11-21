import { AppError } from '../utils/app-error.js';
import { logger, errorMetadata } from '../config/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested route was not found.',
    },
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') error = new AppError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  if (error.type === 'entity.parse.failed') error = new AppError(400, 'INVALID_JSON', 'The request body must be valid JSON.');

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  logger.error({ requestId: req.id, error: errorMetadata(error) }, 'Request failed');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}

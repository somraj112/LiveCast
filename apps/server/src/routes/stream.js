import express from 'express';
import * as streamController from '../controllers/stream.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  createStreamSchema,
  scheduleStreamSchema,
  streamIdSchema,
  updateStreamSchema,
} from '../validations/stream.js';

export const publicStreamRouter = express.Router();
publicStreamRouter.get('/:streamId', validateParams(streamIdSchema), asyncHandler(streamController.getPublicStream));

export const categoryRouter = express.Router();
categoryRouter.get('/', asyncHandler(streamController.listCategories));

export const creatorStreamRouter = express.Router();
creatorStreamRouter.use(authenticate, authorize('CREATOR'));
creatorStreamRouter.get('/', asyncHandler(streamController.listCreatorStreams));
creatorStreamRouter.post('/', validate(createStreamSchema), asyncHandler(streamController.createStream));
creatorStreamRouter.patch(
  '/:streamId',
  validateParams(streamIdSchema),
  validate(updateStreamSchema),
  asyncHandler(streamController.updateStream)
);
creatorStreamRouter.delete(
  '/:streamId',
  validateParams(streamIdSchema),
  asyncHandler(streamController.deleteStream)
);
creatorStreamRouter.post(
  '/:streamId/schedule',
  validateParams(streamIdSchema),
  validate(scheduleStreamSchema),
  asyncHandler(streamController.scheduleStream)
);
creatorStreamRouter.post(
  '/:streamId/start',
  validateParams(streamIdSchema),
  asyncHandler(streamController.startStream)
);
creatorStreamRouter.post(
  '/:streamId/end',
  validateParams(streamIdSchema),
  asyncHandler(streamController.endStream)
);
creatorStreamRouter.get(
  '/:streamId/stream-key',
  validateParams(streamIdSchema),
  asyncHandler(streamController.getStreamKey)
);

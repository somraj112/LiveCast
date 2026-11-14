import express from 'express';
import * as discoveryController from '../controllers/discovery.js';
import { authenticate } from '../middleware/auth.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  creatorIdSchema,
  discoveryQuerySchema,
  historyQuerySchema,
  recordHistorySchema,
  tagQuerySchema,
  usernameSchema,
} from '../validations/discovery.js';

export const discoveryRouter = express.Router();
discoveryRouter.get('/streams', validateQuery(discoveryQuerySchema), asyncHandler(discoveryController.listStreams));
discoveryRouter.get('/tags', validateQuery(tagQuerySchema), asyncHandler(discoveryController.listTags));

export const creatorProfileRouter = express.Router();
creatorProfileRouter.get('/:username', validateParams(usernameSchema), asyncHandler(discoveryController.getCreatorProfile));
creatorProfileRouter.get(
  '/:creatorId/follow-status',
  authenticate,
  validateParams(creatorIdSchema),
  asyncHandler(discoveryController.getFollowStatus)
);
creatorProfileRouter.post(
  '/:creatorId/follow',
  authenticate,
  validateParams(creatorIdSchema),
  asyncHandler(discoveryController.followCreator)
);
creatorProfileRouter.delete(
  '/:creatorId/follow',
  authenticate,
  validateParams(creatorIdSchema),
  asyncHandler(discoveryController.unfollowCreator)
);

export const viewerRouter = express.Router();
viewerRouter.use(authenticate);
viewerRouter.get('/history', validateQuery(historyQuerySchema), asyncHandler(discoveryController.listHistory));
viewerRouter.post('/history', validate(recordHistorySchema), asyncHandler(discoveryController.recordHistory));

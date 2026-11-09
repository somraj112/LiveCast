import express from 'express';
import * as authController from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validations/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = express.Router();

router.post('/register', validate(registerSchema), asyncHandler(authController.register));
router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, authController.me);

export default router;

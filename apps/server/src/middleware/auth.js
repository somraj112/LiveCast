import prisma from '../config/db.js';
import { AppError } from '../utils/app-error.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { userSelect } from '../services/auth.js';

export async function authenticate(req, res, next) {
  try {
    const authorization = req.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'A Bearer access token is required.');
    }

    const payload = await verifyAccessToken(authorization.slice(7));
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: userSelect });
    if (!user) throw new AppError(401, 'ACCOUNT_NOT_FOUND', 'The authenticated account no longer exists.');

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  }
  return next();
};

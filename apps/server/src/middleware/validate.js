import { AppError } from '../utils/app-error.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return next(
      new AppError(400, 'VALIDATION_ERROR', 'The request is invalid.',
        result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })))
    );
  }

  req.validatedBody = result.data;
  return next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    return next(
      new AppError(400, 'VALIDATION_ERROR', 'The request parameters are invalid.',
        result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })))
    );
  }

  req.validatedParams = result.data;
  return next();
};

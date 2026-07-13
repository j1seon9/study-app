import { query } from 'express-validator';

export const statsQueryValidator = [
  query('range').optional().isIn(['week', 'month']).withMessage('range는 week 또는 month여야 합니다.'),
  query('date').optional().isISO8601().withMessage('date 형식이 올바르지 않습니다.'),
];

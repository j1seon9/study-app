import { body } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 8자 이상이어야 합니다.'),
  body('name').trim().notEmpty().withMessage('이름은 필수입니다.'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail(),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
];

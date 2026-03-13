import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getCities,
  getNeighborhoods,
  getRegions
} from '../controllers/restaurantController.js';

const router = express.Router();

// Validação para criação de restaurante
const validateRestaurant = [
  body('name')
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 3, max: 255 })
    .withMessage('Nome deve ter entre 3 e 255 caracteres'),
  body('address')
    .notEmpty()
    .withMessage('Endereço é obrigatório')
    .isLength({ min: 5 })
    .withMessage('Endereço deve ter no mínimo 5 caracteres'),
  body('city')
    .notEmpty()
    .withMessage('Cidade é obrigatória')
    .isLength({ min: 2 })
    .withMessage('Cidade deve ter no mínimo 2 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website deve ser uma URL válida')
];

// Middleware para tratar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erros de validação',
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
};

// Rotas
router.get('/', getAllRestaurants);
router.get('/cities', getCities);
router.get('/neighborhoods', getNeighborhoods);
router.get('/regions', getRegions);
router.get('/:id', getRestaurantById);
router.post('/', validateRestaurant, handleValidationErrors, createRestaurant);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);

export default router;

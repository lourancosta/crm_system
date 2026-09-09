import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from './product.controller';
import { requireModule } from '../../middlewares/authorize';

export const productRoutes = Router();

productRoutes.get('/', requireModule('products', 'view'), listProducts);
productRoutes.post('/', requireModule('products', 'create'), createProduct);
productRoutes.get('/:id', requireModule('products', 'view'), getProduct);
productRoutes.put('/:id', requireModule('products', 'edit'), updateProduct);
productRoutes.delete('/:id', requireModule('products', 'delete'), deleteProduct);

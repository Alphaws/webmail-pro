import { Router } from 'express';
import { AccountController } from '../controllers/accounts';
import { authMiddleware } from '../utils/middleware';

const router = Router();

router.post('/', authMiddleware, AccountController.add);
router.get('/', authMiddleware, AccountController.list);
router.put('/:id', authMiddleware, AccountController.update);
router.delete('/:id', authMiddleware, AccountController.delete);

export default router;

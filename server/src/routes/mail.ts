import { Router } from 'express';
import { MailController } from '../controllers/mail';
import { authMiddleware } from '../utils/middleware';

const router = Router();

router.get('/folders', authMiddleware, MailController.folders);
router.get('/messages', authMiddleware, MailController.messages);
router.get('/body', authMiddleware, MailController.body);

export default router;

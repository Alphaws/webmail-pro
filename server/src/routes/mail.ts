import { Router } from 'express';
import { MailController } from '../controllers/mail';
import { authMiddleware } from '../utils/middleware';

const router = Router();

router.get('/folders', authMiddleware, MailController.folders);
router.get('/messages', authMiddleware, MailController.messages);
router.get('/body', authMiddleware, MailController.body);

router.post('/delete', authMiddleware, MailController.delete);
router.post('/archive', authMiddleware, MailController.archive);
router.post('/toggle-seen', authMiddleware, MailController.toggleSeen);

export default router;

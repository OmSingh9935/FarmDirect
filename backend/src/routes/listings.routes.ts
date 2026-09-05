import { Router } from 'express';
import ListingsController from '../controllers/listings.controller.js';
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthenticate, ListingsController.getListings);
router.get('/:id', optionalAuthenticate, ListingsController.getListingById);
router.post('/preview-grade', ListingsController.previewPreGrade);
router.post('/ai-grade-image', ListingsController.aiGradeImage);
router.post('/', authenticate, requireRole(['farmer']), ListingsController.createListing);
router.put('/:id', authenticate, ListingsController.updateListing);
router.delete('/:id', authenticate, ListingsController.deleteListing);

export default router;

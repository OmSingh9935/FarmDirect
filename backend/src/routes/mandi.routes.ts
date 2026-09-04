import { Router } from 'express';
import MandiController from '../controllers/mandi.controller.js';

const router = Router();

router.get('/crops', MandiController.getCrops);
router.get('/prices', MandiController.getMandiPrices);
router.get('/recommendation', MandiController.getFairPriceRecommendation);

export default router;

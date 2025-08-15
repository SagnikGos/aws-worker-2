import express from 'express';
import { triggerRebalance } from '../controllers/cronController.js';

const router = express.Router();

router.post('/trigger-rebalance', triggerRebalance);

export default router;
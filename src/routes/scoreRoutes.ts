import express from 'express';
import { 
  addDelivery, 
  getDeliveries, 
  removeDelivery, 
  updateBattingOrder, 
  getCurrentScorecard 
} from '../controllers/scoreController';

const router = express.Router();

router.post('/delivery', addDelivery);
router.get('/deliveries', getDeliveries);
router.delete('/delivery/:id', removeDelivery);
router.post('/batting-order', updateBattingOrder);
router.get('/scorecard/:matchId', getCurrentScorecard);

export default router;
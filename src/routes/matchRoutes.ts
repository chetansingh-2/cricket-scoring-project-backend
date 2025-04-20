import express from 'express';
import { 
  createMatch, 
  getMatches, 
  getMatch, 
  updateMatchStatus, 
  updateMatchResult 
} from '../controllers/matchController';

const router = express.Router();

router.post('/', createMatch);
router.get('/', getMatches);
router.get('/:id', getMatch);
router.patch('/:id/status', updateMatchStatus);
router.patch('/:id/result', updateMatchResult);

export default router;
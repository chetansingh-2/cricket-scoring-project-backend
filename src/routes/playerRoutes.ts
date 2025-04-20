import express from 'express';
import {
  createPlayer,
  getPlayers,
  getPlayer,
  updatePlayer,
  deletePlayer
} from '../controllers/playerController';

const router = express.Router();

router.post('/', createPlayer);
router.get('/', getPlayers);
router.get('/:id', getPlayer);
router.put('/:id', updatePlayer);
router.delete('/:id', deletePlayer);

export default router;
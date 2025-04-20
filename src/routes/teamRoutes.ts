import express from 'express';
import {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam
} from '../controllers/teamController';

const router = express.Router();

router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:id', getTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

export default router;
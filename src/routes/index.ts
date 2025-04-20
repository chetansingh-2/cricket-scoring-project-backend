import express from 'express';
import matchRoutes from './matchRoutes';
import scoreRoutes from './scoreRoutes';
import teamRoutes from './teamRoutes';  
import playerRoutes from './playerRoutes'; 
const router = express.Router();

router.use('/matches', matchRoutes);
router.use('/scores', scoreRoutes);
router.use('/teams', teamRoutes);  
router.use('/players', playerRoutes);

export default router;
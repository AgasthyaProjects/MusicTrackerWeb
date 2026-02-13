import express from 'express';
import surveyRoutes from './survey.js';
import launcherRoutes from './launcher.js';

const router = express.Router();

router.use('/survey', surveyRoutes);
router.use('/favoriteTracks', (await import('./favoriteTracks.js')).default);
router.use('/launcher', launcherRoutes);

export default router;

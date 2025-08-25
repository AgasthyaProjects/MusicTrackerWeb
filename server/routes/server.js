import express from 'express';
import surveyRoutes from './survey.js';

const router = express.Router();

router.use('/survey', surveyRoutes);
router.use('/favoriteTracks', (await import('./favoriteTracks.js')).default);

export default router;

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/start', aiController.startInterview);
router.post('/answer', aiController.processAnswer);
router.get('/evaluation/:interviewId', aiController.getEvaluation);
router.get('/history/:userId', aiController.getHistory);

module.exports = router;
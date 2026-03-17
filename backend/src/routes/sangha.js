const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const sanghaController = require('../controllers/sanghaController');

// Public — register sangha (no auth needed)
router.post('/register', sanghaController.registerSangha);

router.use(authenticate);

router.get('/dashboard',    requireRole('sangha'),           sanghaController.getDashboard);
router.get('/',             requireRole('admin'),            sanghaController.getAllSanghas);
router.get('/:id',          requireRole('admin', 'sangha'),  sanghaController.getSanghaById);
router.post('/approve',     requireRole('sangha', 'admin'),  sanghaController.approveUser);
router.post('/reject',      requireRole('sangha', 'admin'),  sanghaController.rejectUser);

module.exports = router;

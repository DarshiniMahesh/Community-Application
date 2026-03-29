const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/dashboard',          adminController.getDashboard);
router.get('/sangha/pending',     adminController.getPendingSanghas);
router.post('/sangha/approve/:id',adminController.approveSangha);
router.post('/sangha/reject/:id', adminController.rejectSangha);

module.exports = router;

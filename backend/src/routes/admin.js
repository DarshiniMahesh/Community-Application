/*Community-Application\backend\src\routes\admin.js*/
const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const ac = require('../controllers/adminController');
console.log('getUserPendingDetail loaded:', typeof ac.getUserPendingDetail);
// ── Public ───────────────────────────────────────────────────
router.post('/login', ac.loginAdmin);

// ── All routes below require admin auth ──────────────────────
router.use(authenticate);
router.use(requireRole('admin'));


// Dashboard
router.get('/dashboard', ac.getDashboard);

// Sangha management
// Sangha management
// ⚠️ IMPORTANT: named routes (pending, all, history, counts)
// must come BEFORE :id routes to avoid Express param conflicts
router.get('/sangha/pending',         ac.getPendingSanghas);
router.get('/sangha/all',             ac.getAllSanghas);
router.get('/sangha/history',         ac.getSanghaHistory);
router.get('/sangha/counts',          ac.getSanghaCounts);
router.post('/sangha/approve/:id',    ac.approveSangha);
router.post('/sangha/reject/:id',     ac.rejectSangha);
router.get('/sangha/:id/detail',      ac.getSanghaDetail);

// User management
// User management
router.get('/users',                        ac.getApprovedUsers);
router.get('/users/all',                    ac.getAllUsers);
router.get('/users/pending',                ac.getPendingUsers);
router.post('/users/approve',               ac.approveUser);
router.post('/users/reject',                ac.rejectUser);
// ⚠️ IMPORTANT: pending-detail must come BEFORE :id/profile
// otherwise Express matches 'pending-detail' as the :id param
router.get('/users/:id/pending-detail',     ac.getUserPendingDetail);
router.get('/users/:id/profile',            ac.getUserProfile);
router.put('/users/:id/profile',            ac.updateUserProfile);

// Activity logs
router.get('/activity-logs',          ac.getActivityLogs);


// Blocklist — search-based
router.get('/blocklist/users',            ac.getBlocklistUsers);
router.get('/blocklist/sanghas',          ac.getBlocklistSanghas);
// ⚠️ /all must come BEFORE generic blocklist routes (already fine here)
router.get('/blocklist/users/all',        ac.getAllBlocklistUsers);
router.get('/blocklist/sanghas/all',      ac.getAllBlocklistSanghas);

// Block / Unblock / Delete — users
// ⚠️ These POST routes must come AFTER all GET /users/... routes
// to avoid Express confusing /users/block with /users/:id routes
router.post('/users/block',           ac.blockUser);
router.post('/users/unblock',         ac.unblockUser);
router.delete('/users/delete',        ac.deleteUser);
// Block / Unblock / Delete — sanghas
router.post('/sangha/block',          ac.blockSangha);
router.post('/sangha/unblock',        ac.unblockSangha);
router.delete('/sangha/delete',       ac.deleteSangha);

module.exports = router;
const express = require('express');

const reportController = require('../controllers/report.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('admin'));
router.get('/pinelabs/transactions/summary', reportController.getPineLabsTransactionSummary);

module.exports = router;

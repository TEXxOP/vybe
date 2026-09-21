const {
    PineLabsPosConfigurationError,
    getPineLabsTransactionSummary,
    redactPineLabsReport,
} = require('../services/pinelabs-pos.service');

// @desc    Retrieve Pine Labs POS terminal transactions for reconciliation
// @route   GET /api/reports/pinelabs/transactions/summary
// @access  Private/Admin
exports.getPineLabsTransactionSummary = async (req, res) => {
    try {
        const { summaryQuery, report } = await getPineLabsTransactionSummary(req.query);
        res.set('Cache-Control', 'no-store');
        return res.status(200).json({
            success: true,
            source: 'pinelabs-pos',
            query: summaryQuery,
            report: redactPineLabsReport(report),
        });
    } catch (error) {
        console.error('Pine Labs POS transaction summary failed:', error.message);
        const status =
            error.statusCode ||
            (error instanceof PineLabsPosConfigurationError ? 503 : 502);
        const message =
            error instanceof PineLabsPosConfigurationError || error.statusCode === 400
                ? error.message
                : 'Could not retrieve the Pine Labs POS transaction summary';
        return res.status(status).json({ success: false, message });
    }
};

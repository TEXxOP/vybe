require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const reportRoutes = require('./routes/report.routes');
const paymentController = require('./controllers/payment.controller');

// Initialize express
const app = express();

// Render (and most PaaS hosts) terminate TLS in a proxy and forward the client
// IP in X-Forwarded-For. Without this, express-rate-limit sees every request as
// coming from the proxy and rate limits all customers as a single bucket.
// `1` trusts exactly one hop; do not widen it to `true`, which would let a
// client spoof its own IP and escape rate limiting.
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security Middleware
app.use(helmet()); // Set security HTTP headers

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// Gateways retry callbacks on failure, so webhooks must not share the per-IP
// browser budget above — a burst of retries would otherwise be rejected with
// 429 and the payment left unresolved.
// It still gets a limit of its own, since the route is publicly reachable.
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: {
        success: false,
        message: 'Too many webhook deliveries, please retry shortly.'
    }
});

// CORS configuration. A payment endpoint must not be callable from arbitrary
// websites using a logged-in customer's browser credentials.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    // A trailing slash here would silently reject the real frontend: browsers
    // send `Origin` with no path and no trailing slash, and the comparison
    // below is exact. Normalising is cheaper than debugging it again.
    .map((origin) => origin.replace(/\/+$/, ''))
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Server-to-server calls and local tools do not send an Origin header.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);

        // Previously this passed an Error to the callback, which fell through to
        // the global handler as a 500 — so a misconfigured FRONTEND_URL looked
        // identical to a crashed server and cost real debugging time. Refuse the
        // CORS headers without erroring: the browser still blocks the response,
        // which is the actual enforcement, and the status now says why.
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// PhonePe signs the original request bytes. This route must run before the
// JSON parser so webhook verification receives the exact body PhonePe sent,
// and before the browser rate limiter so it uses its own budget.
app.post(
    '/api/payments/phonepe/webhook',
    webhookLimiter,
    express.raw({ type: 'application/json', limit: '64kb' }),
    paymentController.handlePhonePeWebhook
);

// Pine Labs signs the original request bytes with an HMAC. Keep this route
// ahead of express.json() for the same reason as PhonePe's callback above.
app.post(
    '/api/payments/pinelabs/webhook',
    webhookLimiter,
    express.raw({ type: 'application/json', limit: '64kb' }),
    paymentController.handlePineLabsWebhook
);

// Every remaining API route shares the per-IP browser budget.
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' })); // Body limit to prevent DOS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'VYBE API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message;

    res.status(err.statusCode || 500).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 VYBE Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

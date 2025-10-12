"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const firebase_1 = require("./config/firebase");
const database_1 = require("./config/database");
const auth_1 = __importDefault(require("./routes/auth"));
const sitters_1 = __importDefault(require("./routes/sitters"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const payments_1 = __importDefault(require("./routes/payments"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
console.log('🔧 Initializing Firebase...');
(0, firebase_1.initializeFirebase)();
console.log('🔧 Initializing Database...');
(0, database_1.connectDatabase)();
console.log('✅ Firebase and Database initialized');
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'CareConnect Backend API'
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/sitters', sitters_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/payments', payments_1.default);
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
const server = app.listen(PORT, () => {
    console.log(`🚀 CareConnect Backend API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map
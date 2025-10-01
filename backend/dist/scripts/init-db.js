"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("../config/database");
dotenv_1.default.config();
const initializeDatabase = async () => {
    try {
        console.log('🚀 Starting database initialization...');
        console.log('🔌 Connecting to database...');
        (0, database_1.connectDatabase)();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await (0, database_1.initializeTables)();
        console.log('✅ Database initialization completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
};
initializeDatabase();
//# sourceMappingURL=init-db.js.map
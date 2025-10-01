"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTables = exports.query = exports.getPool = exports.connectDatabase = void 0;
const pg_1 = require("pg");
let pool;
const connectDatabase = () => {
    try {
        pool = new pg_1.Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'careconnect',
            password: process.env.DB_PASSWORD || 'password',
            port: parseInt(process.env.DB_PORT || '5432'),
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        pool.query('SELECT NOW()', (err, result) => {
            if (err) {
                console.error('❌ Database connection error:', err);
            }
            else {
                console.log('✅ PostgreSQL connected successfully');
                console.log('📅 Database time:', result.rows[0].now);
            }
        });
        pool.on('error', (err) => {
            console.error('❌ Unexpected error on idle client:', err);
        });
    }
    catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const getPool = () => {
    if (!pool) {
        throw new Error('Database not initialized');
    }
    return pool;
};
exports.getPool = getPool;
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Query executed:', { text, duration, rows: res.rowCount });
        return res;
    }
    catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
};
exports.query = query;
const initializeTables = async () => {
    try {
        console.log('🔧 Initializing database tables...');
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('sitter', 'customer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS sitters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL,
        date_of_birth DATE NOT NULL,
        area VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        hours_per_week VARCHAR(50) NOT NULL,
        sitter_type TEXT[] NOT NULL,
        experience TEXT,
        cv_url VARCHAR(500),
        identity_document_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        date_of_birth DATE NOT NULL,
        area VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL,
        hobbies TEXT,
        school_type VARCHAR(50),
        special_needs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS pets (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        breed VARCHAR(100),
        size VARCHAR(50),
        personality TEXT,
        care_instructions TEXT,
        special_needs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_sitters_user_id ON sitters(user_id)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_sitters_area ON sitters(area)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_sitters_city ON sitters(city)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_children_customer_id ON children(customer_id)`);
        await (0, exports.query)(`CREATE INDEX IF NOT EXISTS idx_pets_customer_id ON pets(customer_id)`);
        console.log('✅ Database tables initialized successfully');
    }
    catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
};
exports.initializeTables = initializeTables;
//# sourceMappingURL=database.js.map
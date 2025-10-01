import { Pool } from 'pg';
export declare const connectDatabase: () => void;
export declare const getPool: () => Pool;
export declare const query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
export declare const initializeTables: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map
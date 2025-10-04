import express from 'express';
declare const router: import("express-serve-static-core").Router;
interface AuthenticatedRequest extends express.Request {
    user?: {
        uid: string;
        email?: string;
        [key: string]: any;
    };
}
declare const verifyToken: (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => Promise<void>;
export default router;
export { verifyToken };
export type { AuthenticatedRequest };
//# sourceMappingURL=auth.d.ts.map
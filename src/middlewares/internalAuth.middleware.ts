/**
 * @fileoverview Middleware de autenticación interna para ms-geo.
 * Verifica que las peticiones entrantes incluyan el token interno secreto
 * (x-internal-token) que solo el API Gateway conoce, implementando un
 * modelo de seguridad Zero-Trust entre microservicios.
 */

import { Request, Response, NextFunction } from 'express';
import { envs } from '../config/envs';

/**
 * Middleware que valida el token interno de comunicación entre microservicios.
 *
 * @description Rechaza peticiones que no incluyan el header x-internal-token
 * con el valor correcto definido en INTERNAL_SECRET_TOKEN. Las rutas /health,
 * /metrics y /api/health están exentas de esta verificación.
 *
 * @param req - Objeto Request de Express
 * @param res - Objeto Response de Express
 * @param next - Función NextFunction de Express
 */
export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health' || req.path === '/metrics' || req.path === '/api/health') {
        return next();
    }

    const internalToken = req.headers['x-internal-token'];

    if (!internalToken || internalToken !== envs.INTERNAL_SECRET_TOKEN) {
        res.status(401).json({
            ok: false,
            error: 'Acceso denegado: Petición interna no autorizada.',
        });
        return;
    }

    next();
};

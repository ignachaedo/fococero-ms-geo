/**
 * @fileoverview Middleware de autenticación Firebase para ms-geo.
 * Valida la firma criptográfica del token JWT de Firebase y asigna
 * el usuario autenticado al objeto Request para uso en controladores.
 */

import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';

/**
 * Middleware que verifica el token Firebase ID en el header Authorization.
 * Asigna req.user con uid, email y rol (desde custom claims) si es válido.
 * Delega errores de verificación al manejador global de errores.
 *
 * @param req - Objeto de solicitud Express con header Authorization
 * @param res - Objeto de respuesta Express
 * @param next - Función next de Express
 */
export const validateFirebaseToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        // 🛡️ Escudo 1: Rechazo temprano si no hay formato Bearer o viene vacío
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                ok: false,
                error: 'Acceso denegado: Token Bearer no proporcionado u oculto en ms-geo.',
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        // 🛡️ Escudo 2: Verificación criptográfica en tiempo real
        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            // Extraemos el rol de los claims personalizados de Firebase
            rol: decodedToken.rol as string | undefined,
        };

        next();
    } catch (error: unknown) {
        // Auto-Healing: El error es capturado por el manejador global ms-geo
        next(error);
    }
};

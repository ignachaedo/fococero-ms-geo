/**
 * @fileoverview Middleware validador universal basado en esquemas Zod.
 * Intercepta las peticiones entrantes y valida body, query y params
 * contra un esquema Zod antes de que lleguen al controlador.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware: Validador Universal de Esquemas.
 * Detecta fallos en Body, Query o Params antes de llegar al controlador.
 *
 * @description Factory que retorna un middleware. Ejecuta schema.parseAsync
 * con body, query y params. Si la validación falla (ZodError), responde 400
 * con detalles de los campos inválidos.
 *
 * @param schema - Esquema Zod que define la estructura esperada
 * @returns Middleware function de Express
 */
export const validateSchema = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Zod procesa y limpia los datos (ej: transforma strings de query a números)
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            next();
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                const detailedErrors = error.issues.map((issue) => ({
                    campo: issue.path.join(' > '),
                    mensaje: issue.message,
                }));

                res.status(400).json({
                    ok: false,
                    error: 'Validación fallida: El payload no cumple con el protocolo de FocoCero.',
                    detalles: detailedErrors,
                });
                return;
            }

            next(error);
        }
    };
};

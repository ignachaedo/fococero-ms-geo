/**
 * @fileoverview Controlador de operaciones geoespaciales.
 * Expone los endpoints HTTP para reportar, consultar, actualizar y eliminar
 * focos de incendio con datos georreferenciados.
 */

import { Request, Response } from 'express';
import { GeoService } from '../services/geo.service';
import { catchAsync } from '../helpers/catchAsync';

export class GeoController {
    // --- SECCIÓN CIUDADANA ---

    /**
     * Reporta un nuevo foco de incendio desde la app ciudadana.
     *
     * @param req - Request con body con datos del foco
     * @param res - Response 201 con { ok, data }
     */
    static reportarFoco = catchAsync(async (req: Request, res: Response) => {
        const nuevoFoco = await GeoService.crearFoco(req.body);
        res.status(201).json({ ok: true, data: nuevoFoco });
    });

    /**
     * Obtiene todos los focos de incendio activos.
     *
     * @param _req - Request (no utilizado)
     * @param res - Response 200 con { ok, data }
     */
    static obtenerTodos = catchAsync(async (_req: Request, res: Response) => {
        const focos = await GeoService.obtenerTodos();
        res.status(200).json({ ok: true, data: focos });
    });

    /**
     * Obtiene un foco de incendio por su ID.
     *
     * @param req - Request con params.id
     * @param res - Response 200 con { ok, data }
     */
    static obtenerPorId = catchAsync(async (req: Request, res: Response) => {
        const foco = await GeoService.obtenerPorId(String(req.params.id));
        res.status(200).json({ ok: true, data: foco });
    });

    /**
     * Obtiene focos de incendio cercanos a una ubicación.
     *
     * @param req - Request con query params: lat, lng, radio
     * @param res - Response 200 con { ok, data }
     */
    static obtenerCercanos = catchAsync(async (req: Request, res: Response) => {
        const { lat, lng, radio } = req.query as unknown as {
            lat: number;
            lng: number;
            radio: number;
        };
        const focosCercanos = await GeoService.obtenerCercanos(lat, lng, radio);
        res.status(200).json({ ok: true, data: focosCercanos });
    });

    // --- SECCIÓN OPERATIVA ---

    /**
     * Cambia el estado operativo de un foco (ej: EN_COMBATE, CONTROLADO).
     *
     * @param req - Request con params.id y body.estado
     * @param res - Response 200 con { ok, msg, data }
     */
    static cambiarEstado = catchAsync(async (req: Request, res: Response) => {
        const actualizado = await GeoService.cambiarEstado(String(req.params.id), req.body.estado);
        res.status(200).json({ ok: true, msg: 'Estado actualizado', data: actualizado });
    });

    /**
     * Actualiza el perímetro (área quemada) de un foco.
     *
     * @param req - Request con params.id y body.area_quemada_wkt
     * @param res - Response 200 con { ok, msg, data }
     */
    static actualizarPerimetro = catchAsync(async (req: Request, res: Response) => {
        const actualizado = await GeoService.actualizarPerimetro(
            String(req.params.id),
            req.body.area_quemada_wkt,
        );
        res.status(200).json({ ok: true, msg: 'Perímetro actualizado', data: actualizado });
    });

    /**
     * Actualización integral del foco con recálculo de severidad.
     *
     * @param req - Request con params.id y body con campos a actualizar
     * @param res - Response 200 con { ok, msg, data }
     */
    static actualizarCompleto = catchAsync(async (req: Request, res: Response) => {
        const actualizado = await GeoService.actualizarCompleto(String(req.params.id), req.body);
        res.status(200).json({
            ok: true,
            msg: 'Información integral del reporte actualizada.',
            data: actualizado,
        });
    });

    /**
     * Elimina (soft delete) un foco de incendio.
     *
     * @param req - Request con params.id
     * @param res - Response 200 con { ok, msg }
     */
    static eliminar = catchAsync(async (req: Request, res: Response) => {
        await GeoService.eliminar(String(req.params.id));
        res.status(200).json({ ok: true, msg: 'Reporte removido exitosamente.' });
    });
}

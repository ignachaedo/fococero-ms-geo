/**
 * @fileoverview Servicio de geolocalización y gestión de focos de incendio.
 * Coordina la lógica de negocio para crear, consultar, actualizar y eliminar
 * ubicaciones de incendios, incluyendo cálculos de severidad basados en
 * factores climáticos y de riesgo.
 */

import { GeoRepository } from '../repositories/geo.repository';
import { GeoHelper } from '../helpers/geo.helper';
import { ICrearFocoDTO, IUpdateFocoDTO, IUbicacionFoco, EstadoFoco } from '../models/geo.model';
import { AppError } from '../helpers/appError';

export class GeoService {
    // --- CREACIÓN Y LECTURA ---

    /**
     * Crea un nuevo foco de incendio con severidad calculada automáticamente.
     *
     * @param data - DTO con datos del foco (coordenadas, tipo, viento, amenazas, etc.)
     * @returns Foco de incendio recién creado con severidad evaluada
     */
    static async crearFoco(data: ICrearFocoDTO): Promise<IUbicacionFoco> {
        // Regla: Calcular severidad inicial basada en clima y riesgo
        const severidad = GeoHelper.evaluarSeveridad(
            data.viento_velocidad_kmh || 0,
            data.amenaza_viviendas || false,
        );

        const payload = {
            ...data,
            reporte_id: data.reporte_id || `REP-GEO-${Date.now().toString().slice(-6)}`,
            severidad,
        };

        return await GeoRepository.create(payload);
    }

    /**
     * Obtiene todos los focos de incendio activos (no eliminados).
     *
     * @returns Lista de focos activos ordenados por fecha de creación descendente
     */
    static async obtenerTodos(): Promise<IUbicacionFoco[]> {
        return await GeoRepository.findAllActive();
    }

    /**
     * Obtiene un foco de incendio por su ID.
     *
     * @param id - Identificador único del foco
     * @returns Foco de incendio encontrado
     * @throws AppError(404) - Si el foco no existe
     */
    static async obtenerPorId(id: string): Promise<IUbicacionFoco> {
        const foco = await GeoRepository.findById(id);
        if (!foco) throw new AppError('Incendio geoespacial no encontrado.', 404);
        return foco;
    }

    /**
     * Obtiene focos de incendio cercanos a una ubicación geográfica.
     *
     * @param lat - Latitud del punto de referencia
     * @param lng - Longitud del punto de referencia
     * @param radioMetros - Radio de búsqueda en metros
     * @returns Lista de focos encontrados dentro del radio, ordenados por distancia
     */
    static async obtenerCercanos(
        lat: number,
        lng: number,
        radioMetros: number,
    ): Promise<IUbicacionFoco[]> {
        return await GeoRepository.findNearby(lat, lng, radioMetros);
    }

    // --- GESTIÓN OPERATIVA ---

    /**
     * Cambia el estado operativo de un foco de incendio.
     *
     * @param id - Identificador único del foco
     * @param nuevoEstado - Nuevo estado del foco (ej: REPORTADO, EN_COMBATE, CONTROLADO, EXTINTO)
     * @returns Foco actualizado con el nuevo estado
     * @throws AppError(404) - Si el foco no existe
     * @throws AppError(500) - Si falla la actualización
     */
    static async cambiarEstado(id: string, nuevoEstado: EstadoFoco): Promise<IUbicacionFoco> {
        await this.obtenerPorId(id); // Validamos existencia

        const actualizado = await GeoRepository.updateState(id, nuevoEstado);
        if (!actualizado) throw new AppError('Error al actualizar el estado operativo.', 500);

        return actualizado;
    }

    /**
     * Actualiza el perímetro (área quemada) de un foco usando WKT.
     *
     * @param id - Identificador único del foco
     * @param wktPoligono - Polígono en formato WKT (Well-Known Text)
     * @returns Foco actualizado con el nuevo perímetro
     * @throws AppError(400) - Si el formato WKT no es válido
     * @throws AppError(404) - Si el foco no existe
     */
    static async actualizarPerimetro(id: string, wktPoligono: string): Promise<IUbicacionFoco> {
        await this.obtenerPorId(id);

        const actualizado = await GeoRepository.updatePerimetro(id, wktPoligono);
        if (!actualizado)
            throw new AppError('No se pudo procesar el trazado espacial del perímetro.', 400);

        return actualizado;
    }


    /**
     * Actualización integral de un foco con recálculo de severidad.
     *
     * @description Recalcula la severidad basada en los nuevos valores de viento
     * y amenaza a viviendas. Si no se proporcionan, usa los valores actuales del foco.
     *
     * @param id - Identificador único del foco
     * @param updateData - DTO con campos a actualizar
     * @returns Foco actualizado con severidad recalculada
     * @throws AppError(404) - Si el foco no existe
     * @throws AppError(500) - Si falla la actualización
     */
    static async actualizarCompleto(
        id: string,
        updateData: IUpdateFocoDTO,
    ): Promise<IUbicacionFoco> {
        const focoActual = await this.obtenerPorId(id);

        // Lógica de Recalculación: Si no viene un valor nuevo, usamos el que ya tiene el foco
        const nuevoViento = updateData.viento_velocidad_kmh ?? focoActual.viento_velocidad_kmh;
        const nuevaAmenaza = updateData.amenaza_viviendas ?? focoActual.amenaza_viviendas;

        const severidad = GeoHelper.evaluarSeveridad(nuevoViento, nuevaAmenaza);

        // Llamada sincronizada al repositorio
        const actualizado = await GeoRepository.updateAll(id, { ...updateData, severidad });

        if (!actualizado) {
            throw new AppError(
                'Error al ejecutar la actualización integral en el motor espacial.',
                500,
            );
        }

        return actualizado;
    }

    // --- ELIMINACIÓN ---

    /**
     * Elimina (soft delete) un foco de incendio.
     *
     * @param id - Identificador único del foco a eliminar
     * @throws AppError(404) - Si el foco no existe
     * @throws AppError(500) - Si falla la eliminación
     */
    static async eliminar(id: string): Promise<void> {
        await this.obtenerPorId(id);
        const fueEliminado = await GeoRepository.softDelete(id);
        if (!fueEliminado) throw new AppError('No se pudo remover el reporte del sistema.', 500);
    }
}

/**
 * @neojapan/schemas — fuente única de verdad de contratos.
 *
 * De aquí se derivan: tipos de la API (DTOs), formularios de la tienda/panel
 * y los mocks de tests. Nunca duplicar un shape a mano en otra capa
 * (ver `/context/project-context.md` §3).
 */

export * from './common';
export * from './entities';

export { z } from 'zod';
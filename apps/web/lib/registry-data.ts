/**
 * Compatibility shim: registry data now comes from the frontend domain module.
 * The on-disk adapter is deliberately confined to its server-only subpath.
 */
export { getRegistrySnapshot, RegistryDataError } from '@simplify-dev/module-registry/server';

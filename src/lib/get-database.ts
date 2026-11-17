/**
 * Database selection logic with feature flag support
 * Handles switching between Supabase and Cloudflare D1 databases
 */

import { getDatabaseAdapter, DatabaseAdapter, SupabaseAdapter } from './d1-adapter';

// Feature flag configuration
export const DATABASE_CONFIG = {
  // Set to true to use Cloudflare D1 instead of Supabase
  USE_D1: import.meta.env.VITE_USE_D1 === 'true' || false,

  // D1 Worker URL (e.g., https://api.example.com)
  D1_WORKER_URL: import.meta.env.VITE_D1_API_URL || import.meta.env.VITE_D1_WORKER_URL || '',

  // D1 API Key for authentication
  D1_API_KEY: import.meta.env.VITE_D1_API_KEY || '',
};

/**
 * Global database adapter instance (lazy loaded)
 */
let databaseAdapter: DatabaseAdapter | null = null;

/**
 * Get or create database adapter instance
 * Uses feature flag to determine which database to use
 */
export function getDatabase(): DatabaseAdapter {
  if (databaseAdapter) {
    return databaseAdapter;
  }

  // Import Supabase client (only needed for Supabase adapter)
  if (!DATABASE_CONFIG.USE_D1) {
    const { supabase } = require('./supabase');
    databaseAdapter = getDatabaseAdapter({
      supabase,
      useD1: false,
    });
  } else {
    databaseAdapter = getDatabaseAdapter({
      useD1: true,
      d1WorkerUrl: DATABASE_CONFIG.D1_WORKER_URL,
      d1ApiKey: DATABASE_CONFIG.D1_API_KEY,
    });
  }

  return databaseAdapter;
}

/**
 * Force reset the database adapter (useful for testing or switching databases)
 */
export function resetDatabaseAdapter(): void {
  databaseAdapter = null;
}

/**
 * Check which database is currently active
 */
export function isUsingD1(): boolean {
  return DATABASE_CONFIG.USE_D1;
}

/**
 * Get database health status
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  database: string;
  error?: string;
}> {
  try {
    const db = getDatabase();
    const healthy = await db.isHealthy();
    return {
      healthy,
      database: DATABASE_CONFIG.USE_D1 ? 'D1' : 'Supabase',
    };
  } catch (error) {
    return {
      healthy: false,
      database: DATABASE_CONFIG.USE_D1 ? 'D1' : 'Supabase',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log database configuration (safe version, doesn't expose secrets)
 */
export function logDatabaseConfig(): void {
  console.log('Database Configuration:', {
    database: DATABASE_CONFIG.USE_D1 ? 'Cloudflare D1' : 'Supabase',
    d1Enabled: DATABASE_CONFIG.USE_D1,
    d1WorkerUrl: DATABASE_CONFIG.D1_WORKER_URL ? 'configured' : 'not configured',
    d1ApiKey: DATABASE_CONFIG.D1_API_KEY ? 'configured' : 'not configured',
  });
}

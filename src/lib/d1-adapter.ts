/**
 * D1 Adapter - Dual database adapter for Supabase and Cloudflare D1
 * Provides a unified interface for database operations across both platforms
 */

import { Player, PlayerRole, PaymentStatus, PaymentMethod } from '../types';

export interface DatabaseAdapter {
  // Players table operations
  getPlayers(options?: {
    sortBy?: 'newest' | 'oldest' | 'name' | 'jersey';
    limit?: number;
    offset?: number;
  }): Promise<Player[]>;

  getPlayerById(id: string): Promise<Player | null>;

  createPlayer(player: Player): Promise<Player>;

  updatePlayer(id: string, updates: Partial<Player>): Promise<Player>;

  deletePlayer(id: string): Promise<void>;

  // Query helpers
  searchPlayers(query: string): Promise<Player[]>;

  getPlayersByTournament(tournamentId: string): Promise<Player[]>;

  getPlayersByPaymentStatus(
    status: PaymentStatus
  ): Promise<Player[]>;

  getPlayerStats(): Promise<{
    total: number;
    paid: number;
    pending: number;
    byGender: Record<string, number>;
    byRole: Record<PlayerRole, number>;
    byTournament: Record<string, number>;
  }>;

  // Batch operations
  insertMany(players: Player[]): Promise<void>;

  updateMany(
    updates: Array<{ id: string; data: Partial<Player> }>
  ): Promise<void>;

  isHealthy(): Promise<boolean>;
}

/**
 * Supabase Adapter - Uses @supabase/supabase-js client
 */
export class SupabaseAdapter implements DatabaseAdapter {
  constructor(private supabase: any) {}

  async getPlayers(options?: {
    sortBy?: 'newest' | 'oldest' | 'name' | 'jersey';
    limit?: number;
    offset?: number;
  }): Promise<Player[]> {
    try {
      let query = this.supabase.from('players').select('*');

      // Apply sorting
      if (options?.sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (options?.sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (options?.sortBy === 'name') {
        query = query.order('name', { ascending: true });
      } else if (options?.sortBy === 'jersey') {
        query = query.order('jersey_number', { ascending: true });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase getPlayers error:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Supabase getPlayers exception:', e);
      return [];
    }
  }

  async getPlayerById(id: string): Promise<Player | null> {
    try {
      const { data, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('Supabase getPlayerById error:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Supabase getPlayerById exception:', e);
      return null;
    }
  }

  async createPlayer(player: Player): Promise<Player> {
    try {
      const { data, error } = await this.supabase
        .from('players')
        .insert([player])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create player: ${error.message}`);
      }

      return data;
    } catch (e) {
      throw e;
    }
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    try {
      const { data, error } = await this.supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update player: ${error.message}`);
      }

      return data;
    } catch (e) {
      throw e;
    }
  }

  async deletePlayer(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('players')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete player: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }
  }

  async searchPlayers(query: string): Promise<Player[]> {
    try {
      const q = query.toLowerCase();
      const { data, error } = await this.supabase
        .from('players')
        .select('*')
        .or(`name.ilike.%${q}%,mobile_number.ilike.%${q}%,transaction_id.ilike.%${q}%,flat_no.ilike.%${q}%`);

      if (error) {
        console.error('Supabase searchPlayers error:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Supabase searchPlayers exception:', e);
      return [];
    }
  }

  async getPlayersByTournament(tournamentId: string): Promise<Player[]> {
    try {
      const { data, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getPlayersByTournament error:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Supabase getPlayersByTournament exception:', e);
      return [];
    }
  }

  async getPlayersByPaymentStatus(status: PaymentStatus): Promise<Player[]> {
    try {
      const { data, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('payment_status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getPlayersByPaymentStatus error:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Supabase getPlayersByPaymentStatus exception:', e);
      return [];
    }
  }

  async getPlayerStats(): Promise<{
    total: number;
    paid: number;
    pending: number;
    byGender: Record<string, number>;
    byRole: Record<PlayerRole, number>;
    byTournament: Record<string, number>;
  }> {
    try {
      const players = await this.getPlayers({ limit: 10000 });

      const stats = {
        total: players.length,
        paid: players.filter((p) => p.payment_status === 'paid').length,
        pending: players.filter((p) => p.payment_status === 'pending').length,
        byGender: {} as Record<string, number>,
        byRole: {} as Record<PlayerRole, number>,
        byTournament: {} as Record<string, number>,
      };

      for (const player of players) {
        // Count by gender
        if (player.gender) {
          stats.byGender[player.gender] =
            (stats.byGender[player.gender] || 0) + 1;
        }

        // Count by role
        if (player.role) {
          stats.byRole[player.role] = (stats.byRole[player.role] || 0) + 1;
        }

        // Count by tournament
        if (player.tournament_id) {
          stats.byTournament[player.tournament_id] =
            (stats.byTournament[player.tournament_id] || 0) + 1;
        }
      }

      return stats;
    } catch (e) {
      console.error('Supabase getPlayerStats exception:', e);
      return {
        total: 0,
        paid: 0,
        pending: 0,
        byGender: {},
        byRole: {} as Record<PlayerRole, number>,
        byTournament: {},
      };
    }
  }

  async insertMany(players: Player[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('players')
        .insert(players);

      if (error) {
        throw new Error(`Failed to batch insert players: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }
  }

  async updateMany(
    updates: Array<{ id: string; data: Partial<Player> }>
  ): Promise<void> {
    try {
      for (const { id, data } of updates) {
        await this.updatePlayer(id, data);
      }
    } catch (e) {
      throw e;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('players')
        .select('id')
        .limit(1);
      return true;
    } catch (e) {
      console.warn('Supabase health check failed:', e);
      return false;
    }
  }
}

/**
 * D1 Adapter - Uses Cloudflare D1 API via Worker
 */
export class D1Adapter implements DatabaseAdapter {
  constructor(private workerUrl: string, private apiKey: string) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.workerUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `D1 request failed: ${response.status} ${response.statusText}`;
      try {
        const errBody = (await response.json()) as { error?: string; message?: string };
        if (errBody?.error || errBody?.message) {
          errorMsg = errBody.error || errBody.message || errorMsg;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    return response.json();
  }

  async getPlayers(options?: {
    sortBy?: 'newest' | 'oldest' | 'name' | 'jersey';
    limit?: number;
    offset?: number;
  }): Promise<Player[]> {
    try {
      const query = new URLSearchParams();

      if (options?.sortBy) query.append('sortBy', options.sortBy);
      if (options?.limit) query.append('limit', options.limit.toString());
      if (options?.offset) query.append('offset', options.offset.toString());

      const data = await this.request<{ players: Player[] }>(
        `/api/players?${query.toString()}`
      );

      return data.players || [];
    } catch (e) {
      console.error('D1 getPlayers error:', e);
      return [];
    }
  }

  async getPlayerById(id: string): Promise<Player | null> {
    try {
      const data = await this.request<{ player: Player | null }>(
        `/api/players/${id}`
      );
      return data.player || null;
    } catch (e) {
      console.error('D1 getPlayerById error:', e);
      return null;
    }
  }

  async createPlayer(player: Player): Promise<Player> {
    try {
      const data = await this.request<{ player: Player }>(
        '/api/players',
        {
          method: 'POST',
          body: JSON.stringify(player),
        }
      );
      return data.player;
    } catch (e) {
      throw e;
    }
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    try {
      const data = await this.request<{ player: Player }>(
        `/api/players/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      );
      return data.player;
    } catch (e) {
      throw e;
    }
  }

  async deletePlayer(id: string): Promise<void> {
    try {
      await this.request(`/api/players/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      throw e;
    }
  }

  async searchPlayers(query: string): Promise<Player[]> {
    try {
      const data = await this.request<{ players: Player[] }>(
        `/api/players/search?q=${encodeURIComponent(query)}`
      );
      return data.players || [];
    } catch (e) {
      console.error('D1 searchPlayers error:', e);
      return [];
    }
  }

  async getPlayersByTournament(tournamentId: string): Promise<Player[]> {
    try {
      const data = await this.request<{ players: Player[] }>(
        `/api/players/tournament/${tournamentId}`
      );
      return data.players || [];
    } catch (e) {
      console.error('D1 getPlayersByTournament error:', e);
      return [];
    }
  }

  async getPlayersByPaymentStatus(status: PaymentStatus): Promise<Player[]> {
    try {
      const data = await this.request<{ players: Player[] }>(
        `/api/players/status/${status}`
      );
      return data.players || [];
    } catch (e) {
      console.error('D1 getPlayersByPaymentStatus error:', e);
      return [];
    }
  }

  async getPlayerStats(): Promise<{
    total: number;
    paid: number;
    pending: number;
    byGender: Record<string, number>;
    byRole: Record<PlayerRole, number>;
    byTournament: Record<string, number>;
  }> {
    try {
      const data = await this.request<ReturnType<DatabaseAdapter['getPlayerStats']>>(
        '/api/stats'
      );
      return data;
    } catch (e) {
      console.error('D1 getPlayerStats error:', e);
      return {
        total: 0,
        paid: 0,
        pending: 0,
        byGender: {},
        byRole: {} as Record<PlayerRole, number>,
        byTournament: {},
      };
    }
  }

  async insertMany(players: Player[]): Promise<void> {
    try {
      await this.request('/api/players/batch', {
        method: 'POST',
        body: JSON.stringify({ players }),
      });
    } catch (e) {
      throw e;
    }
  }

  async updateMany(
    updates: Array<{ id: string; data: Partial<Player> }>
  ): Promise<void> {
    try {
      await this.request('/api/players/batch', {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      });
    } catch (e) {
      throw e;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch (e) {
      console.warn('D1 health check failed:', e);
      return false;
    }
  }
}

/**
 * Factory function to get the appropriate adapter based on feature flag
 */
export function getDatabaseAdapter(config: {
  supabase?: any;
  useD1?: boolean;
  d1WorkerUrl?: string;
  d1ApiKey?: string;
}): DatabaseAdapter {
  if (config.useD1 && config.d1WorkerUrl && config.d1ApiKey) {
    return new D1Adapter(config.d1WorkerUrl, config.d1ApiKey);
  }

  if (!config.supabase) {
    throw new Error(
      'No database adapter configured. Either provide supabase client or enable D1 with configuration.'
    );
  }

  return new SupabaseAdapter(config.supabase);
}

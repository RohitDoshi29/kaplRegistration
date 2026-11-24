/**
 * Cloudflare D1 Database Client
 * Replaces Supabase
 */

const D1_API_URL = import.meta.env.VITE_D1_API_URL || 'http://localhost:8787/api';

interface Player {
  id: string;
  name: string;
  mobile_number: string;
  email?: string;
  [key: string]: any;
}

class D1Client {
  private apiUrl: string;

  constructor(apiUrl: string = D1_API_URL) {
    this.apiUrl = apiUrl;
  }

  // Get all players
  async getPlayers() {
    const response = await fetch(`${this.apiUrl}/players`);
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
  }

  // Insert player
  async insertPlayer(player: Player) {
    const response = await fetch(`${this.apiUrl}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player),
    });
    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(error?.message || 'Failed to insert player');
    }
    return response.json();
  }

  // Get single player
  async getPlayer(id: string) {
    const response = await fetch(`${this.apiUrl}/players/${id}`);
    if (!response.ok) throw new Error('Failed to fetch player');
    return response.json();
  }

  // Update player
  async updatePlayer(id: string, data: Partial<Player>) {
    const response = await fetch(`${this.apiUrl}/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update player');
    return response.json();
  }

  // Delete player
  async deletePlayer(id: string) {
    const response = await fetch(`${this.apiUrl}/players/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete player');
    return response.json();
  }
}

export const d1 = new D1Client();

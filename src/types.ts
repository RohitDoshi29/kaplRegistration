export type PlayerRole = 'batter' | 'bowler' | 'all_rounder' | 'wicket_keeper';

export type PaymentMethod = 'upi_qr';
export type PaymentStatus = 'paid' | 'pending';

export interface Player {
  id: string;
  name: string;
  mobile_number: string;
  email?: string;
  role: PlayerRole;
  batting_style: string;
  bowling_style: string;
  jersey_number?: number | null;
  tournament_id?: string;
  base_price?: number;
  photo_url?: string | null;
  experience?: string;
  previous_team?: string;
  past_achievements?: string;
  bio?: string;
  gender?: 'male' | 'female';
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  transaction_id?: string;
  payment_amount?: number;
  payment_receipt_url?: string;
  created_at?: string;
}

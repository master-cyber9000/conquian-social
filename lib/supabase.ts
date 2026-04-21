import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          code: string;
          host_id: string;
          status: 'lobby' | 'playing' | 'finished';
          pot: number;
          bet_amount: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['rooms']['Row']>;
      };
      players: {
        Row: {
          id: string;
          room_code: string;
          player_id: string;
          display_name: string;
          avatar: string;
          border_color: string;
          seat_number: number | null;
          is_spectator: boolean;
          balance: number;
          is_ready: boolean;
          vote: string | null;
          is_connected: boolean;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['players']['Row']>;
      };
      game_state: {
        Row: {
          room_code: string;
          deck: CardType[];
          hands: Record<string, CardType[]>;
          melds: Record<string, CardType[][]>;
          discard_pile: CardType[];
          stock_pile: CardType[];
          current_player_id: string;
          turn_phase: 'offer_discard' | 'draw_or_take' | 'meld_or_discard' | 'between_turns';
          round_number: number;
          meld_counts: Record<string, number>;
          offer_claimed_by?: string | null;
        };
        Insert: Database['public']['Tables']['game_state']['Row'];
        Update: Partial<Database['public']['Tables']['game_state']['Row']>;
      };
      messages: {
        Row: {
          id: string;
          room_code: string;
          player_id: string;
          display_name: string;
          avatar: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
      };
    };
  };
};

export type CardType = {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  id: string; // e.g. "A-hearts"
};

export type GameState = Database['public']['Tables']['game_state']['Row'];
export type Room = Database['public']['Tables']['rooms']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

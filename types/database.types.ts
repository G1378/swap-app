/**
 * Placeholder for Supabase's generated database types.
 *
 * Once your Supabase project is linked, regenerate this file with:
 *   npx supabase gen types typescript --project-id <your-project-id> > types/database.types.ts
 *
 * Until then, `Database` is loosely typed so the app still compiles.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Database {
  public: {
    Tables: Record<string, LooseTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

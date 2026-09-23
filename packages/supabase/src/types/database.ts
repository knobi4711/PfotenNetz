export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        Insert: {
          booking_number: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id?: string | null;
          id?: string;
          key_handoff_details?: Json | null;
          key_handoff_type?: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address?: string | null;
          meeting_location?: unknown;
          pet_id: string;
          price_eur_cents?: number;
          price_kiez_hours?: number;
          rating_helper?: number | null;
          rating_seeker?: number | null;
          review_helper?: string | null;
          review_seeker?: string | null;
          seeker_id: string;
          start_at: string;
          status?: Database['public']['Enums']['booking_status'];
          timebank_credits_earned?: number;
          timebank_credits_spent?: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at?: string;
        };
        Update: {
          booking_number?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency'];
          end_at?: string;
          helper_id?: string | null;
          id?: string;
          key_handoff_details?: Json | null;
          key_handoff_type?: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address?: string | null;
          meeting_location?: unknown;
          pet_id?: string;
          price_eur_cents?: number;
          price_kiez_hours?: number;
          rating_helper?: number | null;
          rating_seeker?: number | null;
          review_helper?: string | null;
          review_seeker?: string | null;
          seeker_id?: string;
          start_at?: string;
          status?: Database['public']['Enums']['booking_status'];
          timebank_credits_earned?: number;
          timebank_credits_spent?: number;
          type?: Database['public']['Enums']['booking_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_cancelled_by_fkey';
            columns: ['cancelled_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancelled_by_fkey';
            columns: ['cancelled_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_helper_id_fkey';
            columns: ['helper_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_helper_id_fkey';
            columns: ['helper_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_seeker_id_fkey';
            columns: ['seeker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_seeker_id_fkey';
            columns: ['seeker_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      community_events: {
        Row: {
          address: string | null;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          id: string;
          is_public: boolean;
          location: unknown;
          max_participants: number | null;
          organizer_id: string;
          required_trust_level: string;
          starts_at: string;
          title: string;
          type: Database['public']['Enums']['event_type'];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          is_public?: boolean;
          location: unknown;
          max_participants?: number | null;
          organizer_id: string;
          required_trust_level?: string;
          starts_at: string;
          title: string;
          type: Database['public']['Enums']['event_type'];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          is_public?: boolean;
          location?: unknown;
          max_participants?: number | null;
          organizer_id?: string;
          required_trust_level?: string;
          starts_at?: string;
          title?: string;
          type?: Database['public']['Enums']['event_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'community_events_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'community_events_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      devices: {
        Row: {
          app_version: string | null;
          created_at: string;
          device_name: string | null;
          id: string;
          is_active: boolean;
          last_seen_at: string | null;
          platform: string;
          push_token: string | null;
          push_token_updated_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          platform: string;
          push_token?: string | null;
          push_token_updated_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          platform?: string;
          push_token?: string | null;
          push_token_updated_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      event_participants: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_participants_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'community_events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      hazard_sightings: {
        Row: {
          created_at: string;
          description: string | null;
          hazard_id: string;
          id: string;
          location: unknown;
          photo_url: string | null;
          reporter_id: string;
          updated_at: string;
          verified: boolean;
          verified_by: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          hazard_id: string;
          id?: string;
          location: unknown;
          photo_url?: string | null;
          reporter_id: string;
          updated_at?: string;
          verified?: boolean;
          verified_by?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          hazard_id?: string;
          id?: string;
          location?: unknown;
          photo_url?: string | null;
          reporter_id?: string;
          updated_at?: string;
          verified?: boolean;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hazard_sightings_hazard_id_fkey';
            columns: ['hazard_id'];
            isOneToOne: false;
            referencedRelation: 'hazards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_sightings_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_sightings_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_sightings_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_sightings_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      hazards: {
        Row: {
          address: string | null;
          created_at: string;
          description: string | null;
          expires_at: string;
          hazard_number: string;
          id: string;
          karma_awarded: number;
          location: unknown;
          notify_count: number;
          photos: string[];
          radius_km: number;
          reporter_id: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: Database['public']['Enums']['hazard_severity'];
          status: Database['public']['Enums']['hazard_status'];
          type: Database['public']['Enums']['hazard_type'];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          expires_at?: string;
          hazard_number: string;
          id?: string;
          karma_awarded?: number;
          location: unknown;
          notify_count?: number;
          photos?: string[];
          radius_km?: number;
          reporter_id: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: Database['public']['Enums']['hazard_severity'];
          status?: Database['public']['Enums']['hazard_status'];
          type: Database['public']['Enums']['hazard_type'];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          expires_at?: string;
          hazard_number?: string;
          id?: string;
          karma_awarded?: number;
          location?: unknown;
          notify_count?: number;
          photos?: string[];
          radius_km?: number;
          reporter_id?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: Database['public']['Enums']['hazard_severity'];
          status?: Database['public']['Enums']['hazard_status'];
          type?: Database['public']['Enums']['hazard_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hazards_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazards_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazards_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazards_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      helper_availabilities: {
        Row: {
          booking_types: string[];
          created_at: string;
          day_of_week: number;
          end_time: string;
          helper_id: string;
          id: string;
          is_active: boolean;
          max_distance_km: number;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          booking_types?: string[];
          created_at?: string;
          day_of_week: number;
          end_time: string;
          helper_id: string;
          id?: string;
          is_active?: boolean;
          max_distance_km?: number;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          booking_types?: string[];
          created_at?: string;
          day_of_week?: number;
          end_time?: string;
          helper_id?: string;
          id?: string;
          is_active?: boolean;
          max_distance_km?: number;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'helper_availabilities_helper_id_fkey';
            columns: ['helper_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'helper_availabilities_helper_id_fkey';
            columns: ['helper_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          booking_id: string;
          content: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          read_at: string | null;
          sender_id: string;
          type: Database['public']['Enums']['message_type'];
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          content?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          sender_id: string;
          type?: Database['public']['Enums']['message_type'];
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          content?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          sender_id?: string;
          type?: Database['public']['Enums']['message_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      missing_pets: {
        Row: {
          created_at: string;
          description: string | null;
          found_at: string | null;
          found_by: string | null;
          found_location: unknown;
          id: string;
          last_seen_at: string;
          last_seen_location: unknown;
          pet_id: string;
          photos: string[];
          reporter_id: string;
          search_radius_km: number;
          status: Database['public']['Enums']['missing_pet_status'];
          tasso_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          found_at?: string | null;
          found_by?: string | null;
          found_location?: unknown;
          id?: string;
          last_seen_at: string;
          last_seen_location: unknown;
          pet_id: string;
          photos?: string[];
          reporter_id: string;
          search_radius_km?: number;
          status?: Database['public']['Enums']['missing_pet_status'];
          tasso_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          found_at?: string | null;
          found_by?: string | null;
          found_location?: unknown;
          id?: string;
          last_seen_at?: string;
          last_seen_location?: unknown;
          pet_id?: string;
          photos?: string[];
          reporter_id?: string;
          search_radius_km?: number;
          status?: Database['public']['Enums']['missing_pet_status'];
          tasso_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'missing_pets_found_by_fkey';
            columns: ['found_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'missing_pets_found_by_fkey';
            columns: ['found_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'missing_pets_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'missing_pets_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'missing_pets_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data: Json;
          id: string;
          push_sent: boolean;
          push_token: string | null;
          read_at: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json;
          id?: string;
          push_sent?: boolean;
          push_token?: string | null;
          read_at?: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          push_sent?: boolean;
          push_token?: string | null;
          read_at?: string | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pets: {
        Row: {
          allergies: string[] | null;
          avatar_url: string | null;
          birth_date: string | null;
          breed: string | null;
          color: string | null;
          created_at: string;
          emergency_card: Json;
          id: string;
          insurance_policy: string | null;
          is_active: boolean;
          is_deceased: boolean;
          medications: Json;
          microchip_number: string | null;
          name: string;
          owner_id: string;
          special_needs: string | null;
          species: string;
          tattoo_number: string | null;
          updated_at: string;
          vet_clinic: string | null;
          vet_phone: string | null;
          weight_kg: number | null;
        };
        Insert: {
          allergies?: string[] | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          breed?: string | null;
          color?: string | null;
          created_at?: string;
          emergency_card?: Json;
          id?: string;
          insurance_policy?: string | null;
          is_active?: boolean;
          is_deceased?: boolean;
          medications?: Json;
          microchip_number?: string | null;
          name: string;
          owner_id: string;
          special_needs?: string | null;
          species: string;
          tattoo_number?: string | null;
          updated_at?: string;
          vet_clinic?: string | null;
          vet_phone?: string | null;
          weight_kg?: number | null;
        };
        Update: {
          allergies?: string[] | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          breed?: string | null;
          color?: string | null;
          created_at?: string;
          emergency_card?: Json;
          id?: string;
          insurance_policy?: string | null;
          is_active?: boolean;
          is_deceased?: boolean;
          medications?: Json;
          microchip_number?: string | null;
          name?: string;
          owner_id?: string;
          special_needs?: string | null;
          species?: string;
          tattoo_number?: string | null;
          updated_at?: string;
          vet_clinic?: string | null;
          vet_phone?: string | null;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pets_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pets_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          kiez_radius_km: number;
          language: string;
          location: unknown;
          location_updated_at: string | null;
          notification_prefs: Json;
          onboarding_completed: boolean;
          phone: string | null;
          role: string;
          timezone: string;
          trust_level: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
          kiez_radius_km?: number;
          language?: string;
          location?: unknown;
          location_updated_at?: string | null;
          notification_prefs?: Json;
          onboarding_completed?: boolean;
          phone?: string | null;
          role?: string;
          timezone?: string;
          trust_level?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          kiez_radius_km?: number;
          language?: string;
          location?: unknown;
          location_updated_at?: string | null;
          notification_prefs?: Json;
          onboarding_completed?: boolean;
          phone?: string | null;
          role?: string;
          timezone?: string;
          trust_level?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      timebank_accounts: {
        Row: {
          balance_hours: number;
          last_transaction_at: string | null;
          total_earned_hours: number;
          total_spent_hours: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance_hours?: number;
          last_transaction_at?: string | null;
          total_earned_hours?: number;
          total_spent_hours?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance_hours?: number;
          last_transaction_at?: string | null;
          total_earned_hours?: number;
          total_spent_hours?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timebank_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'timebank_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      timebank_transactions: {
        Row: {
          amount_hours: number;
          balance_after_hours: number;
          balance_before_hours: number;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          metadata: Json;
          reference_id: string | null;
          reference_type: string;
          type: Database['public']['Enums']['timebank_tx_type'];
          user_id: string;
        };
        Insert: {
          amount_hours: number;
          balance_after_hours: number;
          balance_before_hours: number;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          metadata?: Json;
          reference_id?: string | null;
          reference_type: string;
          type: Database['public']['Enums']['timebank_tx_type'];
          user_id: string;
        };
        Update: {
          amount_hours?: number;
          balance_after_hours?: number;
          balance_before_hours?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          metadata?: Json;
          reference_id?: string | null;
          reference_type?: string;
          type?: Database['public']['Enums']['timebank_tx_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timebank_transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'timebank_transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'timebank_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'timebank_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tracking_points: {
        Row: {
          accuracy_meters: number | null;
          altitude_meters: number | null;
          heading_degrees: number | null;
          id: string;
          is_batched: boolean;
          latitude: number;
          longitude: number;
          received_at: string;
          recorded_at: string;
          session_id: string;
          speed_mps: number | null;
        };
        Insert: {
          accuracy_meters?: number | null;
          altitude_meters?: number | null;
          heading_degrees?: number | null;
          id?: string;
          is_batched?: boolean;
          latitude: number;
          longitude: number;
          received_at?: string;
          recorded_at?: string;
          session_id: string;
          speed_mps?: number | null;
        };
        Update: {
          accuracy_meters?: number | null;
          altitude_meters?: number | null;
          heading_degrees?: number | null;
          id?: string;
          is_batched?: boolean;
          latitude?: number;
          longitude?: number;
          received_at?: string;
          recorded_at?: string;
          session_id?: string;
          speed_mps?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tracking_points_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'tracking_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      tracking_sessions: {
        Row: {
          booking_id: string;
          business_log: Json;
          created_at: string;
          ended_at: string | null;
          id: string;
          milestones: Json;
          started_at: string;
          total_distance_meters: number;
          total_duration_seconds: number;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          business_log?: Json;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          milestones?: Json;
          started_at?: string;
          total_distance_meters?: number;
          total_duration_seconds?: number;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          business_log?: Json;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          milestones?: Json;
          started_at?: string;
          total_distance_meters?: number;
          total_duration_seconds?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      verifications: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['verification_status'];
          storage_paths: string[];
          type: Database['public']['Enums']['verification_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_status'];
          storage_paths?: string[];
          type: Database['public']['Enums']['verification_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_status'];
          storage_paths?: string[];
          type?: Database['public']['Enums']['verification_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'verifications_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'verifications_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string | null;
          role: string | null;
          trust_level: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          role?: string | null;
          trust_level?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          role?: string | null;
          trust_level?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      addauth: { Args: { '': string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      current_user_location: { Args: never; Returns: unknown };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      find_nearby_helpers: {
        Args: {
          p_latitude: number;
          p_limit?: number;
          p_longitude: number;
          p_radius_km?: number;
        };
        Returns: {
          available_days: number[];
          avatar_url: string;
          display_name: string;
          distance_km: number;
          helper_id: string;
          latitude: number;
          longitude: number;
          rating: number;
          total_walks: number;
          trust_level: string;
        }[];
      };
      geometry: { Args: { '': string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { '': string }; Returns: unknown };
      get_active_hazards_in_radius: {
        Args: { p_latitude: number; p_longitude: number; p_radius_km?: number };
        Returns: {
          description: string;
          distance_km: number;
          hazard_number: string;
          id: string;
          latitude: number;
          longitude: number;
          radius_km: number;
          severity: string;
          type: string;
        }[];
      };
      get_helper_detail: {
        Args: { p_helper_id: string };
        Returns: {
          available_days: number[];
          avatar_url: string;
          display_name: string;
          distance_km: number;
          helper_id: string;
          latitude: number;
          longitude: number;
          rating: number;
          slots: Json;
          total_walks: number;
          trust_level: string;
        }[];
      };
      get_user_stats: {
        Args: { p_user_id: string };
        Returns: {
          avg_rating: number;
          completed_bookings: number;
          timebank_balance: number;
          total_bookings: number;
          trust_level: string;
        }[];
      };
      gettransactionid: { Args: never; Returns: unknown };
      haversine_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number };
        Returns: number;
      };
      helper_accept_booking: {
        Args: { p_booking_id: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      helper_complete_booking: {
        Args: { p_booking_id: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      helper_rate_seeker: {
        Args: { p_booking_id: string; p_rating: number; p_review?: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      helper_reject_booking: {
        Args: { p_booking_id: string; p_reason?: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      helper_start_booking: {
        Args: { p_booking_id: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: never; Returns: boolean };
      longtransactionsenabled: { Args: never; Returns: boolean };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      seeker_cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      seeker_rate_helper: {
        Args: { p_booking_id: string; p_rating: number; p_review?: string };
        Returns: {
          booking_number: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          currency: Database['public']['Enums']['currency'];
          end_at: string;
          helper_id: string | null;
          id: string;
          key_handoff_details: Json | null;
          key_handoff_type: Database['public']['Enums']['key_handoff_type'] | null;
          meeting_address: string | null;
          meeting_location: unknown;
          pet_id: string;
          price_eur_cents: number;
          price_kiez_hours: number;
          rating_helper: number | null;
          rating_seeker: number | null;
          review_helper: string | null;
          review_seeker: string | null;
          seeker_id: string;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          timebank_credits_earned: number;
          timebank_credits_spent: number;
          type: Database['public']['Enums']['booking_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { '': string }; Returns: string };
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_astext: { Args: { '': string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { '': string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { '': string }; Returns: unknown };
      st_geographyfromtext: { Args: { '': string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { '': string }; Returns: unknown };
      st_geomfromewkt: { Args: { '': string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown };
      st_geomfromgml: { Args: { '': string }; Returns: unknown };
      st_geomfromkml: { Args: { '': string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { '': string }; Returns: unknown };
      st_gmltosql: { Args: { '': string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database['public']['CompositeTypes']['valid_detail'];
        SetofOptions: {
          from: '*';
          to: 'valid_detail';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { '': string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { '': string }; Returns: unknown };
      st_mpointfromtext: { Args: { '': string }; Returns: unknown };
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
      st_multipointfromtext: { Args: { '': string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { '': string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { '': string }; Returns: unknown };
      st_polygonfromtext: { Args: { '': string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        { Args: { geog: unknown }; Returns: number } | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { '': string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      timebank_adjust: {
        Args: {
          p_amount_hours: number;
          p_description: string;
          p_metadata?: Json;
          p_reference_id: string;
          p_reference_type: string;
          p_type: Database['public']['Enums']['timebank_tx_type'];
          p_user_id: string;
        };
        Returns: {
          amount_hours: number;
          balance_after_hours: number;
          balance_before_hours: number;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          metadata: Json;
          reference_id: string | null;
          reference_type: string;
          type: Database['public']['Enums']['timebank_tx_type'];
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'timebank_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      tracking_live_position: {
        Args: never;
        Returns: {
          accuracy_meters: number;
          heading_degrees: number;
          latitude: number;
          longitude: number;
          recorded_at: string;
          session_id: string;
          speed_mps: number;
        }[];
      };
      unlockrows: { Args: { '': string }; Returns: number };
      update_own_location: {
        Args: { p_latitude: number; p_longitude: number };
        Returns: undefined;
      };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      booking_status:
        'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
      booking_type: 'walk' | 'feeding' | 'vacation' | 'daycare';
      currency: 'EUR' | 'KIEZ_HOURS';
      event_type: 'group_walk' | 'playdate' | 'meetup' | 'swap_meet' | 'training' | 'other';
      hazard_severity: 'low' | 'medium' | 'high' | 'critical';
      hazard_status: 'draft' | 'pending_review' | 'active' | 'resolved' | 'expired' | 'rejected';
      hazard_type:
        'poison_bait' | 'glass_shards' | 'wasp_nest' | 'aggressive_dog' | 'trap' | 'other';
      key_handoff_type: 'lockbox' | 'personal' | 'smartlock' | 'neighbor';
      message_type: 'text' | 'image' | 'location' | 'voice' | 'system';
      missing_pet_status: 'active' | 'found' | 'cancelled';
      notification_type:
        | 'chat_message'
        | 'booking_request'
        | 'booking_confirmed'
        | 'booking_cancelled'
        | 'tracking_started'
        | 'tracking_milestone'
        | 'tracking_ended'
        | 'hazard_alert'
        | 'hazard_resolved'
        | 'missing_pet_alert'
        | 'missing_pet_found'
        | 'community_event'
        | 'verification_update'
        | 'timebank_update'
        | 'system';
      timebank_tx_type: 'earned' | 'spent' | 'bonus' | 'adjustment' | 'transfer';
      verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
      verification_type: 'id_document' | 'liability_insurance' | 'guarantor' | 'pet_owner_proof';
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        'requested',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'disputed',
      ],
      booking_type: ['walk', 'feeding', 'vacation', 'daycare'],
      currency: ['EUR', 'KIEZ_HOURS'],
      event_type: ['group_walk', 'playdate', 'meetup', 'swap_meet', 'training', 'other'],
      hazard_severity: ['low', 'medium', 'high', 'critical'],
      hazard_status: ['draft', 'pending_review', 'active', 'resolved', 'expired', 'rejected'],
      hazard_type: ['poison_bait', 'glass_shards', 'wasp_nest', 'aggressive_dog', 'trap', 'other'],
      key_handoff_type: ['lockbox', 'personal', 'smartlock', 'neighbor'],
      message_type: ['text', 'image', 'location', 'voice', 'system'],
      missing_pet_status: ['active', 'found', 'cancelled'],
      notification_type: [
        'chat_message',
        'booking_request',
        'booking_confirmed',
        'booking_cancelled',
        'tracking_started',
        'tracking_milestone',
        'tracking_ended',
        'hazard_alert',
        'hazard_resolved',
        'missing_pet_alert',
        'missing_pet_found',
        'community_event',
        'verification_update',
        'timebank_update',
        'system',
      ],
      timebank_tx_type: ['earned', 'spent', 'bonus', 'adjustment', 'transfer'],
      verification_status: ['pending', 'approved', 'rejected', 'expired'],
      verification_type: ['id_document', 'liability_insurance', 'guarantor', 'pet_owner_proof'],
    },
  },
} as const;

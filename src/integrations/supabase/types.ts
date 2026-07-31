export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_packages: {
        Row: {
          banner_slots: number
          color: string
          created_at: string
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number
          shop_promo_slots: number
          sort_order: number
          sponsored_product_slots: number
          tier: string
        }
        Insert: {
          banner_slots?: number
          color?: string
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price: number
          shop_promo_slots?: number
          sort_order?: number
          sponsored_product_slots?: number
          tier: string
        }
        Update: {
          banner_slots?: number
          color?: string
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          shop_promo_slots?: number
          sort_order?: number
          sponsored_product_slots?: number
          tier?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          apartment: string | null
          city: string
          created_at: string
          id: string
          is_default: boolean
          lat: number | null
          lng: number | null
          notes: string | null
          phone: string
          recipient_name: string
          street: string
          title: string
          user_id: string
        }
        Insert: {
          apartment?: string | null
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          lat?: number | null
          lng?: number | null
          notes?: string | null
          phone: string
          recipient_name: string
          street: string
          title?: string
          user_id: string
        }
        Update: {
          apartment?: string | null
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          lat?: number | null
          lng?: number | null
          notes?: string | null
          phone?: string
          recipient_name?: string
          street?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          audience: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          audience?: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          audience?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_replies_log: {
        Row: {
          channel: string
          completion_tokens: number | null
          created_at: string
          error: string | null
          id: string
          prompt_tokens: number | null
          reply_id: string | null
          source_message_id: string | null
          status: string
        }
        Insert: {
          channel: string
          completion_tokens?: number | null
          created_at?: string
          error?: string | null
          id?: string
          prompt_tokens?: number | null
          reply_id?: string | null
          source_message_id?: string | null
          status?: string
        }
        Update: {
          channel?: string
          completion_tokens?: number | null
          created_at?: string
          error?: string | null
          id?: string
          prompt_tokens?: number | null
          reply_id?: string | null
          source_message_id?: string | null
          status?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          enabled: boolean
          enabled_dispute: boolean
          enabled_pvz: boolean
          enabled_shop: boolean
          enabled_support: boolean
          id: string
          model: string
          system_prompt_dispute: string
          system_prompt_pvz: string
          system_prompt_shop: string
          system_prompt_support: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          enabled_dispute?: boolean
          enabled_pvz?: boolean
          enabled_shop?: boolean
          enabled_support?: boolean
          id?: string
          model?: string
          system_prompt_dispute?: string
          system_prompt_pvz?: string
          system_prompt_shop?: string
          system_prompt_support?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          enabled_dispute?: boolean
          enabled_pvz?: boolean
          enabled_shop?: boolean
          enabled_support?: boolean
          id?: string
          model?: string
          system_prompt_dispute?: string
          system_prompt_pvz?: string
          system_prompt_shop?: string
          system_prompt_support?: string
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          ad_label: string
          alt_text: string | null
          clicks: number
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          link_url: string | null
          mobile_image_url: string | null
          position: string
          priority: number
          seller_id: string | null
          starts_at: string | null
          subscription_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ad_label?: string
          alt_text?: string | null
          clicks?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          mobile_image_url?: string | null
          position?: string
          priority?: number
          seller_id?: string | null
          starts_at?: string | null
          subscription_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ad_label?: string
          alt_text?: string | null
          clicks?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          mobile_image_url?: string | null
          position?: string
          priority?: number
          seller_id?: string | null
          starts_at?: string | null
          subscription_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      bonus_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          background_color: string | null
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          name: string
          name_en: string | null
          name_ru: string | null
          parent_id: string | null
          popularity_score: number
          slug: string
          sort_order: number
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name: string
          name_en?: string | null
          name_ru?: string | null
          parent_id?: string | null
          popularity_score?: number
          slug: string
          sort_order?: number
        }
        Update: {
          background_color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name?: string
          name_en?: string | null
          name_ru?: string | null
          parent_id?: string | null
          popularity_score?: number
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      compare_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          city: string
          created_at: string
          current_route: string | null
          earnings: number
          full_name: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          phone: string
          rating: number
          total_deliveries: number
          updated_at: string
          user_id: string | null
          vehicle_type: string
        }
        Insert: {
          city?: string
          created_at?: string
          current_route?: string | null
          earnings?: number
          full_name: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          phone: string
          rating?: number
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string
        }
        Update: {
          city?: string
          created_at?: string
          current_route?: string | null
          earnings?: number
          full_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string
          rating?: number
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      customer_cards: {
        Row: {
          brand: string
          created_at: string
          exp_month: number
          exp_year: number
          holder: string
          id: string
          is_default: boolean
          last4: string
          provider_token: string | null
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          exp_month: number
          exp_year: number
          holder: string
          id?: string
          is_default?: boolean
          last4: string
          provider_token?: string | null
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          exp_month?: number
          exp_year?: number
          holder?: string
          id?: string
          is_default?: boolean
          last4?: string
          provider_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dispute_messages: {
        Row: {
          body: string
          created_at: string
          dispute_id: string
          id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          dispute_id: string
          id?: string
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          dispute_id?: string
          id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          buyer_id: string
          compensation: number | null
          created_at: string
          decided_for: string | null
          description: string | null
          id: string
          order_id: string | null
          order_item_id: string | null
          reason: string
          resolution: string | null
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          compensation?: number | null
          created_at?: string
          decided_for?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          reason: string
          resolution?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          compensation?: number | null
          created_at?: string
          decided_for?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          reason?: string
          resolution?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      epoint_payment_transactions: {
        Row: {
          amount: number
          bank_transaction_id: string | null
          card_mask: string | null
          created_at: string
          currency: string
          id: string
          last_callback_payload: Json
          merchant_order_id: string
          message: string | null
          operation_code: string | null
          paid_at: string | null
          provider_transaction_id: string | null
          response_code: string | null
          returned_at: string | null
          rrn: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_transaction_id?: string | null
          card_mask?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_callback_payload?: Json
          merchant_order_id: string
          message?: string | null
          operation_code?: string | null
          paid_at?: string | null
          provider_transaction_id?: string | null
          response_code?: string | null
          returned_at?: string | null
          rrn?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_transaction_id?: string | null
          card_mask?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_callback_payload?: Json
          merchant_order_id?: string
          message?: string | null
          operation_code?: string | null
          paid_at?: string | null
          provider_transaction_id?: string | null
          response_code?: string | null
          returned_at?: string | null
          rrn?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      epoint_payment_webhook_events: {
        Row: {
          event_hash: string
          id: number
          merchant_order_id: string
          payload: Json
          provider_status: string
          provider_transaction_id: string | null
          received_at: string
        }
        Insert: {
          event_hash: string
          id?: never
          merchant_order_id: string
          payload: Json
          provider_status: string
          provider_transaction_id?: string | null
          received_at?: string
        }
        Update: {
          event_hash?: string
          id?: never
          merchant_order_id?: string
          payload?: Json
          provider_status?: string
          provider_transaction_id?: string | null
          received_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          audience: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          keywords: string | null
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          audience?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          audience?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          k…10519 tokens truncated…   maintenance_mode?: boolean
          min_payout?: number
          payments_mode?: string
          promo_terms_text?: string
          seller_signup_fee?: number
          single_banner_days?: number
          single_banner_price?: number
          single_product_promo_days?: number
          single_product_promo_price?: number
          single_shop_promo_days?: number
          single_shop_promo_price?: number
          storage_fee_per_day?: number
          updated_at?: string
        }
        Update: {
          bonus_earn_percent?: number
          bonus_to_azn?: number
          cod_enabled?: boolean
          commission_percent?: number
          delivery_base_fee?: number
          id?: string
          maintenance_mode?: boolean
          min_payout?: number
          payments_mode?: string
          promo_terms_text?: string
          seller_signup_fee?: number
          single_banner_days?: number
          single_banner_price?: number
          single_product_promo_days?: number
          single_product_promo_price?: number
          single_shop_promo_days?: number
          single_shop_promo_price?: number
          storage_fee_per_day?: number
          updated_at?: string
        }
        Relationships: []
      }
      treasury_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          direction: string
          id: string
          kind: string
          note: string | null
          order_id: string | null
          order_item_id: string | null
          payout_request_id: string | null
          pickup_point_id: string | null
          seller_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          kind: string
          note?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payout_request_id?: string | null
          pickup_point_id?: string | null
          seller_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          kind?: string
          note?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payout_request_id?: string | null
          pickup_point_id?: string | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string
          capacity: number
          city: string
          created_at: string
          id: string
          is_active: boolean
          manager_name: string | null
          name: string
          occupied: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          address: string
          capacity?: number
          city: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name: string
          occupied?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          capacity?: number
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name?: string
          occupied?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      couriers_public: {
        Row: {
          city: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          rating: number | null
          total_deliveries: number | null
          vehicle_type: string | null
        }
        Insert: {
          city?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          rating?: number | null
          total_deliveries?: number | null
          vehicle_type?: string | null
        }
        Update: {
          city?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          rating?: number | null
          total_deliveries?: number | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      pickup_points_public: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          lat: number | null
          lng: number | null
          name: string | null
          point_number: number | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          point_number?: number | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          point_number?: number | null
          working_hours?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          seller_tier: string | null
          seller_total_orders: number | null
          shop_banner_url: string | null
          shop_city: string | null
          shop_description: string | null
          shop_email: string | null
          shop_logo_url: string | null
          shop_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          seller_tier?: string | null
          seller_total_orders?: number | null
          shop_banner_url?: string | null
          shop_city?: string | null
          shop_description?: string | null
          shop_email?: string | null
          shop_logo_url?: string | null
          shop_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          seller_tier?: string | null
          seller_total_orders?: number | null
          shop_banner_url?: string | null
          shop_city?: string | null
          shop_description?: string | null
          shop_email?: string | null
          shop_logo_url?: string | null
          shop_name?: string | null
        }
        Relationships: []
      }
      seller_shops_public: {
        Row: {
          id: string | null
          seller_tier: string | null
          seller_total_orders: number | null
          shop_address: string | null
          shop_city: string | null
          shop_description: string | null
          shop_lat: number | null
          shop_lng: number | null
          shop_logo_url: string | null
          shop_name: string | null
        }
        Insert: {
          id?: string | null
          seller_tier?: string | null
          seller_total_orders?: number | null
          shop_address?: string | null
          shop_city?: string | null
          shop_description?: string | null
          shop_lat?: number | null
          shop_lng?: number | null
          shop_logo_url?: string | null
          shop_name?: string | null
        }
        Update: {
          id?: string | null
          seller_tier?: string | null
          seller_total_orders?: number | null
          shop_address?: string | null
          shop_city?: string | null
          shop_description?: string | null
          shop_lat?: number | null
          shop_lng?: number | null
          shop_logo_url?: string | null
          shop_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      record_banner_click: { Args: { p_banner_id: string }; Returns: undefined }
      record_banner_impression: { Args: { p_banner_id: string }; Returns: undefined }
      add_manual_treasury: {
        Args: { _amount: number; _direction: string; _note: string }
        Returns: string
      }
      admin_get_pickup_phones: {
        Args: never
        Returns: {
          id: string
          phone: string
        }[]
      }
      auto_payout_after_3_days: { Args: never; Returns: number }
      become_seller: { Args: { _shop_name: string }; Returns: undefined }
      call_ai_auto_reply: {
        Args: { _channel: string; _message_id: string }
        Returns: undefined
      }
      can_pvz_update_order_item: {
        Args: { _item_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_order_item: {
        Args: { _item_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_ai_chat_messages: { Args: never; Returns: undefined }
      complete_payout_request: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      decrement_stock: {
        Args: { product_id: string; qty: number }
        Returns: undefined
      }
      get_owner_admin_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_promo_used_count: {
        Args: { promo_code: string }
        Returns: undefined
      }
      is_buyer_only: { Args: { _user_id: string }; Returns: boolean }
      mark_order_paid: {
        Args: { _method?: string; _note?: string; _order_id: string }
        Returns: undefined
      }
      order_belongs_to_user: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      prepare_seller_payment: {
        Args: {
          _phone?: string
          _shop_city?: string
          _shop_name: string
          _user_id: string
          _voen?: string
        }
        Returns: {
          amount: number
          application_id: string
          application_status: string
          currency: string
          merchant_order_id: string
        }[]
      }
      process_card_payment: {
        Args: { _card_id?: string; _new_card?: Json; _order_id: string }
        Returns: Json
      }
      process_epoint_callback: {
        Args: {
          p_amount: number
          p_bank_transaction_id: string
          p_card_mask: string
          p_currency: string
          p_event_hash: string
          p_merchant_order_id: string
          p_message: string
          p_operation_code: string
          p_payload: Json
          p_provider_transaction_id: string
          p_response_code: string
          p_rrn: string
          p_status: string
        }
        Returns: string
      }
      recalc_product_review_stats: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      register_pvz_staff: {
        Args: {
          _full_name: string
          _new_pvz_address?: string
          _new_pvz_city?: string
          _new_pvz_name?: string
          _phone: string
          _pickup_point_id?: string
          _position?: string
        }
        Returns: string
      }
      register_seller: {
        Args: {
          _phone?: string
          _shop_city?: string
          _shop_name: string
          _voen?: string
        }
        Returns: undefined
      }
      request_payout: { Args: { _amount: number }; Returns: string }
      set_default_card: { Args: { _card_id: string }; Returns: undefined }
      sync_order_status_from_items: {
        Args: { _order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer" | "pvz"
      order_status:
        | "pending"
        | "paid"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "buyer", "pvz"],
      order_status: [
        "pending",
        "paid",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const


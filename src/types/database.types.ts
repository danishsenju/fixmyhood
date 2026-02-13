export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          points: number
          is_admin: boolean
          is_banned: boolean
          active_frame: string
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          points?: number
          is_admin?: boolean
          is_banned?: boolean
          active_frame?: string
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          points?: number
          is_admin?: boolean
          is_banned?: boolean
          active_frame?: string
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string
          category: 'infrastructure' | 'safety' | 'cleanliness' | 'environment' | 'other'
          status: 'open' | 'acknowledged' | 'in_progress' | 'closed'
          photo_url: string | null
          location_text: string | null
          latitude: number | null
          longitude: number | null
          is_hidden: boolean
          comments_locked: boolean
          duplicate_of: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description: string
          category: 'infrastructure' | 'safety' | 'cleanliness' | 'environment' | 'other'
          status?: 'open' | 'acknowledged' | 'in_progress' | 'closed'
          photo_url?: string | null
          location_text?: string | null
          latitude?: number | null
          longitude?: number | null
          is_hidden?: boolean
          comments_locked?: boolean
          duplicate_of?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string
          category?: 'infrastructure' | 'safety' | 'cleanliness' | 'environment' | 'other'
          status?: 'open' | 'acknowledged' | 'in_progress' | 'closed'
          photo_url?: string | null
          location_text?: string | null
          latitude?: number | null
          longitude?: number | null
          is_hidden?: boolean
          comments_locked?: boolean
          duplicate_of?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          report_id: string
          user_id: string
          content: string
          comment_type: 'comment' | 'progress' | 'confirm_fix'
          image_url: string | null
          is_hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          content: string
          comment_type?: 'comment' | 'progress' | 'confirm_fix'
          image_url?: string | null
          is_hidden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          content?: string
          comment_type?: 'comment' | 'progress' | 'confirm_fix'
          image_url?: string | null
          is_hidden?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_report_id_fkey"
            columns: ["report_id"]
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      followers: {
        Row: {
          report_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          report_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          report_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_report_id_fkey"
            columns: ["report_id"]
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      confirmations: {
        Row: {
          report_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          report_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          report_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmations_report_id_fkey"
            columns: ["report_id"]
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_badges: {
        Row: {
          user_id: string
          badge_type: 'first_report' | 'helper' | 'resolver'
          earned_at: string
        }
        Insert: {
          user_id: string
          badge_type: 'first_report' | 'helper' | 'resolver'
          earned_at?: string
        }
        Update: {
          user_id?: string
          badge_type?: 'first_report' | 'helper' | 'resolver'
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      report_views: {
        Row: {
          id: string
          report_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_views_report_id_fkey"
            columns: ["report_id"]
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_views_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comment_verifications: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_verifications_comment_id_fkey"
            columns: ["comment_id"]
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_verifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      flags: {
        Row: {
          id: string
          content_type: 'report' | 'comment'
          content_id: string
          reporter_id: string
          reason: string
          status: 'pending' | 'reviewed' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          content_type: 'report' | 'comment'
          content_id: string
          reporter_id: string
          reason: string
          status?: 'pending' | 'reviewed' | 'dismissed'
          created_at?: string
        }
        Update: {
          id?: string
          content_type?: 'report' | 'comment'
          content_id?: string
          reporter_id?: string
          reason?: string
          status?: 'pending' | 'reviewed' | 'dismissed'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific types for convenience
export type Profile = Tables<'profiles'>
export type Report = Tables<'reports'>
export type Comment = Tables<'comments'>
export type Follower = Tables<'followers'>
export type Confirmation = Tables<'confirmations'>
export type UserBadge = Tables<'user_badges'>
export type ReportView = Tables<'report_views'>
export type CommentVerification = Tables<'comment_verifications'>
export type Flag = Tables<'flags'>
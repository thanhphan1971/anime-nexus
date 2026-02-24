import { supabaseAdmin } from './supabaseAdmin';

export interface SupabaseProfile {
  id: string;
  handle: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  age_band: 'child' | 'teen' | 'adult' | null;
  is_minor: boolean;
  tokens: number;
  followers: number;
  following: number;
  is_premium: boolean;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_admin: boolean;
  is_banned: boolean;
  anime_interests: string[];
  theme: string;
  parent_email: string | null;
  access_source: string | null;
  access_expires_at: string | null;
  last_reactivate_date: string | null;
  used_retention_bonus: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentLink {
  id: string;
  minor_id: string;
  parent_id: string;
  status: 'pending' | 'approved' | 'revoked';
  created_at: string;
  approved_at: string | null;
}

export interface SupabasePurchaseRequest {
  id: string;
  minor_id: string;
  parent_id: string;
  token_amount: number;
  price_cents: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  decided_at: string | null;
  decision_reason: string | null;
}

export interface SupabaseNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

function calculateAgeBand(birthYear: number | null): 'child' | 'teen' | 'adult' {
  if (!birthYear) return 'adult';
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

export class SupabaseProfileAdapter {
  async getProfile(id: string): Promise<SupabaseProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return data as SupabaseProfile;
  }

  async getProfileByHandle(handle: string): Promise<SupabaseProfile | null> {
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('handle', cleanHandle)
      .single();
    
    if (error || !data) return null;
    return data as SupabaseProfile;
  }

  async getPublicProfile(id: string): Promise<Partial<SupabaseProfile> | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, handle, username, display_name, avatar_url, bio, age_band, is_minor, tokens, followers, following, is_premium, is_admin, anime_interests, theme, created_at')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return data;
  }

  async createProfile(profile: Partial<SupabaseProfile> & { id: string }): Promise<SupabaseProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }
    return data as SupabaseProfile;
  }

  async updateProfile(id: string, updates: Partial<SupabaseProfile>): Promise<SupabaseProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }
    return data as SupabaseProfile;
  }

  async createParentLink(minorId: string, parentId: string): Promise<ParentLink | null> {
    const { data, error } = await supabaseAdmin
      .from('parent_links')
      .insert({ minor_id: minorId, parent_id: parentId })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating parent link:', error);
      return null;
    }
    return data as ParentLink;
  }

  async getParentLink(minorId: string, parentId: string): Promise<ParentLink | null> {
    const { data, error } = await supabaseAdmin
      .from('parent_links')
      .select('*')
      .eq('minor_id', minorId)
      .eq('parent_id', parentId)
      .single();
    
    if (error || !data) return null;
    return data as ParentLink;
  }

  async getApprovedParentForMinor(minorId: string): Promise<ParentLink | null> {
    const { data, error } = await supabaseAdmin
      .from('parent_links')
      .select('*')
      .eq('minor_id', minorId)
      .eq('status', 'approved')
      .single();
    
    if (error || !data) return null;
    return data as ParentLink;
  }

  async approveParentLink(id: string): Promise<ParentLink | null> {
    const { data, error } = await supabaseAdmin
      .from('parent_links')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error approving parent link:', error);
      return null;
    }
    return data as ParentLink;
  }

  async revokeParentLink(id: string): Promise<ParentLink | null> {
    const { data, error } = await supabaseAdmin
      .from('parent_links')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error revoking parent link:', error);
      return null;
    }
    return data as ParentLink;
  }

  async createPurchaseRequest(request: Omit<SupabasePurchaseRequest, 'id' | 'created_at' | 'decided_at' | 'decision_reason' | 'status'>): Promise<SupabasePurchaseRequest | null> {
    const { data, error } = await supabaseAdmin
      .from('purchase_requests')
      .insert(request)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating purchase request:', error);
      return null;
    }
    return data as SupabasePurchaseRequest;
  }

  async updatePurchaseRequest(id: string, updates: Partial<SupabasePurchaseRequest>): Promise<SupabasePurchaseRequest | null> {
    const { data, error } = await supabaseAdmin
      .from('purchase_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating purchase request:', error);
      return null;
    }
    return data as SupabasePurchaseRequest;
  }

  async getPendingPurchaseRequestsForParent(parentId: string): Promise<SupabasePurchaseRequest[]> {
    const { data, error } = await supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching purchase requests:', error);
      return [];
    }
    return data as SupabasePurchaseRequest[];
  }

  async createNotification(notification: Omit<SupabaseNotification, 'id' | 'created_at' | 'read_at'>): Promise<SupabaseNotification | null> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }
    return data as SupabaseNotification;
  }

  async getNotificationsForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<SupabaseNotification[]> {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    
    if (options?.unreadOnly) {
      query = query.is('read_at', null);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    return data as SupabaseNotification[];
  }

  async markNotificationRead(id: string): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null);
  }
}

export const supabaseProfileAdapter = new SupabaseProfileAdapter();

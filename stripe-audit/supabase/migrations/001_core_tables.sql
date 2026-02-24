-- AniRealm Core Tables Migration
-- This migration creates the production-ready schema with RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT DEFAULT 'New to AniRealm',
    birth_date DATE,
    age_band TEXT CHECK (age_band IN ('child', 'teen', 'adult')) DEFAULT 'adult',
    is_minor BOOLEAN NOT NULL DEFAULT false,
    tokens INTEGER NOT NULL DEFAULT 100,
    followers INTEGER NOT NULL DEFAULT 0,
    following INTEGER NOT NULL DEFAULT 0,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    subscription_status TEXT CHECK (subscription_status IN ('none', 'active', 'canceled_pending_expiry', 'expired')) DEFAULT 'none',
    subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'yearly')) DEFAULT NULL,
    subscription_end_date TIMESTAMPTZ DEFAULT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_banned BOOLEAN NOT NULL DEFAULT false,
    anime_interests TEXT[] DEFAULT '{}',
    theme TEXT DEFAULT 'cyberpunk',
    parent_email TEXT,
    access_source TEXT CHECK (access_source IN ('subscription', 'admin_grant')) DEFAULT NULL,
    access_expires_at TIMESTAMPTZ DEFAULT NULL,
    last_reactivate_date TIMESTAMPTZ DEFAULT NULL,
    used_retention_bonus BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_minor ON public.profiles(is_minor);

-- ============================================
-- 2. PARENT_LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.parent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    minor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'approved', 'revoked')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    UNIQUE(minor_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_minor ON public.parent_links(minor_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON public.parent_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_status ON public.parent_links(status);

-- ============================================
-- 3. PURCHASE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    minor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_amount INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'cad',
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_minor ON public.purchase_requests(minor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_parent ON public.purchase_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON public.purchase_requests(status);

-- ============================================
-- 4. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is approved parent of a minor
CREATE OR REPLACE FUNCTION public.is_approved_parent(parent_user_id UUID, minor_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.parent_links 
        WHERE parent_id = parent_user_id 
        AND minor_id = minor_user_id 
        AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES - SECURE COLUMN-LEVEL ACCESS
-- ============================================
-- CRITICAL: We restrict which columns are exposed to different users
-- Public users can only see non-sensitive profile data
-- Owners, approved parents, and admins can see sensitive data

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- Owners can read their own full profile
CREATE POLICY "Owners can read their own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Approved parents can read their linked minor's profile
CREATE POLICY "Parents can read linked minor profiles"
ON public.profiles FOR SELECT
USING (
    public.is_approved_parent(auth.uid(), id)
);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only owner can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Only owner can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Only owner or admin can delete profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

-- ============================================
-- PUBLIC PROFILES VIEW (Safe for public access)
-- ============================================
-- This view exposes ONLY safe, public fields
-- Use this view for public profile fetches
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT 
    id,
    handle,
    username,
    display_name,
    avatar_url,
    bio,
    age_band,
    tokens,
    followers,
    following,
    is_premium,
    is_admin,
    anime_interests,
    theme,
    created_at
FROM public.profiles
WHERE is_banned = false;

-- Grant select on public view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- ============================================
-- PARENT_LINKS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own parent links" ON public.parent_links;
DROP POLICY IF EXISTS "Minors can create parent link requests" ON public.parent_links;
DROP POLICY IF EXISTS "Parents can update link status" ON public.parent_links;
DROP POLICY IF EXISTS "Minors can delete their pending link requests" ON public.parent_links;
DROP POLICY IF EXISTS "Admins can view all parent links" ON public.parent_links;

-- Only minor or parent can view their links
CREATE POLICY "Users can view their own parent links"
ON public.parent_links FOR SELECT
USING (auth.uid() = minor_id OR auth.uid() = parent_id);

-- Only minor can create link request
CREATE POLICY "Minors can create parent link requests"
ON public.parent_links FOR INSERT
WITH CHECK (auth.uid() = minor_id);

-- Only parent can update link status
CREATE POLICY "Parents can update link status"
ON public.parent_links FOR UPDATE
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- Only minor can delete their pending link request
CREATE POLICY "Minors can delete their pending link requests"
ON public.parent_links FOR DELETE
USING (auth.uid() = minor_id AND status = 'pending');

-- Admins can view all parent links
CREATE POLICY "Admins can view all parent links"
ON public.parent_links FOR SELECT
USING (public.is_admin(auth.uid()));

-- ============================================
-- PURCHASE_REQUESTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Minors can create purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Parents can update purchase request status" ON public.purchase_requests;
DROP POLICY IF EXISTS "Admins can view all purchase requests" ON public.purchase_requests;

-- Only minor or parent can view purchase requests
CREATE POLICY "Users can view their own purchase requests"
ON public.purchase_requests FOR SELECT
USING (auth.uid() = minor_id OR auth.uid() = parent_id);

-- Only minor can create purchase request (must have approved parent link)
CREATE POLICY "Minors can create purchase requests"
ON public.purchase_requests FOR INSERT
WITH CHECK (
    auth.uid() = minor_id 
    AND public.is_approved_parent(parent_id, minor_id)
);

-- Only parent can update purchase request status
CREATE POLICY "Parents can update purchase request status"
ON public.purchase_requests FOR UPDATE
USING (auth.uid() = parent_id AND status = 'pending')
WITH CHECK (auth.uid() = parent_id);

-- Admins can view all purchase requests
CREATE POLICY "Admins can view all purchase requests"
ON public.purchase_requests FOR SELECT
USING (public.is_admin(auth.uid()));

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Only recipient can view their notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- Only recipient can update their notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- SERVICE ROLE BYPASS
-- ============================================
-- Note: The service_role key bypasses RLS by default in Supabase
-- This is used for server-side operations like creating notifications,
-- fetching any profile data, etc.

-- ============================================
-- SECURITY NOTES
-- ============================================
-- 1. profiles table is NOT publicly readable - use public_profiles view
-- 2. Sensitive fields (email, birth_date, parent_email, stripe_*) are protected
-- 3. Server uses service_role to bypass RLS for admin operations
-- 4. Client apps must use public_profiles view for public profile lookups
-- 5. Only owner, approved parents, and admins can see full profile data

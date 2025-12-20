import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "./supabaseClient";

// Helper function for API calls with automatic auth token
export async function apiCall(url: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Get Supabase session and add Authorization header if available
  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    // Continue without auth if Supabase is unavailable
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// Posts API
export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: () => apiCall("/api/posts"),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content?: string; image?: string }) =>
      apiCall("/api/posts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      apiCall(`/api/posts/${postId}/like`, { method: "POST" }),
    onSuccess: (data: { liked: boolean; likeCount: number }, postId: string) => {
      // Update React Query cache directly to prevent stale data issues
      queryClient.setQueryData(["posts"], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((post: any) => 
          post.id === postId 
            ? { ...post, likes: data.likeCount, likedByCurrentUser: data.liked }
            : post
        );
      });
    },
  });
}

// Users API
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiCall("/api/users"),
  });
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => apiCall(`/api/users/${userId}`),
    enabled: !!userId,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) =>
      apiCall(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUserByHandle(handle: string | undefined) {
  return useQuery({
    queryKey: ["userByHandle", handle],
    queryFn: () => apiCall(`/api/users/by-handle/${handle}`),
    enabled: !!handle,
    retry: false,
  });
}

export function useCheckHandle(handle: string | undefined) {
  return useQuery({
    queryKey: ["checkHandle", handle],
    queryFn: () => apiCall(`/api/handles/check/${handle}`),
    enabled: !!handle && handle.length >= 3,
  });
}

export function useUpdateHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, handle }: { userId: string; handle: string }) =>
      apiCall(`/api/users/${userId}/handle`, {
        method: "PATCH",
        body: JSON.stringify({ handle }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["userByHandle"] });
    },
  });
}

// Cards API
export function useCards() {
  return useQuery({
    queryKey: ["cards"],
    queryFn: () => apiCall("/api/cards"),
  });
}

export function useUserCards(userId: string | undefined) {
  return useQuery({
    queryKey: ["userCards", userId],
    queryFn: () => apiCall(`/api/users/${userId}/cards`),
    enabled: !!userId,
  });
}

export function useSummonCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiCall("/api/cards/summon", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userCards"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; character: string; anime: string; rarity: string; image: string; power: number; element: string }) =>
      apiCall("/api/cards", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, force }: { cardId: string; force?: boolean }) =>
      apiCall(`/api/cards/${cardId}${force ? '?force=true' : ''}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["adminCards"] });
    },
  });
}

export function useAdminCards() {
  return useQuery({
    queryKey: ["adminCards"],
    queryFn: () => apiCall("/api/cards/admin"),
  });
}

export function useArchiveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) =>
      apiCall(`/api/cards/${cardId}/archive`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["adminCards"] });
    },
  });
}

export function useUnarchiveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) =>
      apiCall(`/api/cards/${cardId}/unarchive`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["adminCards"] });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, updates }: { cardId: string; updates: Partial<{ name: string; character: string; anime: string; rarity: string; image: string; power: number; element: string; categoryId: string | null }> }) =>
      apiCall(`/api/cards/${cardId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["adminCards"] });
    },
  });
}

// Card Categories API
export function useCardCategories() {
  return useQuery({
    queryKey: ["cardCategories"],
    queryFn: () => apiCall("/api/admin/card-categories"),
  });
}

export function useCreateCardCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string; color?: string; sortOrder?: number }) =>
      apiCall("/api/admin/card-categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardCategories"] });
    },
  });
}

export function useUpdateCardCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<{ name: string; slug: string; description: string; color: string; sortOrder: number }> }) =>
      apiCall(`/api/admin/card-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardCategories"] });
    },
  });
}

export function useDeleteCardCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall(`/api/admin/card-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardCategories"] });
    },
  });
}

// Card Upload API
export function useGetCardUploadUrl() {
  return useMutation({
    mutationFn: (contentType: string) =>
      apiCall("/api/admin/cards/upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType }),
      }),
  });
}

// Card Scheduling API
export function useScheduledCards() {
  return useQuery({
    queryKey: ["scheduledCards"],
    queryFn: () => apiCall("/api/admin/cards/scheduled"),
  });
}

export function useCardsByStatus(status: string) {
  return useQuery({
    queryKey: ["cardsByStatus", status],
    queryFn: () => apiCall(`/api/admin/cards/by-status/${status}`),
    enabled: !!status,
  });
}

export function useUpdateCardStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, status, scheduledReleaseDate }: { cardId: string; status: string; scheduledReleaseDate?: string }) =>
      apiCall(`/api/admin/cards/${cardId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, scheduledReleaseDate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["adminCards"] });
      queryClient.invalidateQueries({ queryKey: ["scheduledCards"] });
      queryClient.invalidateQueries({ queryKey: ["cardsByStatus"], exact: false });
    },
  });
}

export function useActivateScheduledCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/admin/cards/activate-scheduled", { method: "POST" }),
    onSuccess: (data: { activated: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["adminCards"] });
      queryClient.invalidateQueries({ queryKey: ["scheduledCards"] });
      queryClient.invalidateQueries({ queryKey: ["cardsByStatus"], exact: false });
      return data;
    },
  });
}

// Marketplace API
export function useMarketListings() {
  return useQuery({
    queryKey: ["marketListings"],
    queryFn: () => apiCall("/api/market/listings"),
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { cardId: string; price: number }) =>
      apiCall("/api/market/listings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketListings"] });
    },
  });
}

export function usePurchaseListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) =>
      apiCall(`/api/market/listings/${listingId}/purchase`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketListings"] });
      queryClient.invalidateQueries({ queryKey: ["userCards"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// Communities API
export function useCommunities() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: () => apiCall("/api/communities"),
  });
}

export function useCommunityMessages(communityId: string | undefined) {
  return useQuery({
    queryKey: ["communityMessages", communityId],
    queryFn: () => apiCall(`/api/communities/${communityId}/messages`),
    enabled: !!communityId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, message }: { communityId: string; message: string }) =>
      apiCall(`/api/communities/${communityId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["communityMessages", variables.communityId],
      });
    },
  });
}

// Swipe API (Find Nakama)
export function useSwipeCandidates() {
  return useQuery({
    queryKey: ["swipeCandidates"],
    queryFn: () => apiCall("/api/swipe/candidates"),
  });
}

export function useSwipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { toUserId: string; action: "like" | "pass" }) =>
      apiCall("/api/swipe", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swipeCandidates"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: () => apiCall("/api/swipe/matches"),
  });
}

// Admin API
export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiCall(`/api/admin/users/${userId}/ban`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiCall(`/api/admin/users/${userId}/unban`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useGrantPremium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, startDate, endDate }: { userId: string; startDate?: string; endDate?: string }) =>
      apiCall(`/api/admin/users/${userId}/premium`, { 
        method: "POST",
        body: JSON.stringify({ startDate, endDate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRevokePremium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiCall(`/api/admin/users/${userId}/revoke-premium`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// Site Settings API
export function useSiteSettings() {
  return useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => apiCall("/api/settings"),
    staleTime: 60000, // Cache for 1 minute
  });
}

// Free Gacha API
export function useFreeGachaStatus() {
  return useQuery({
    queryKey: ["freeGachaStatus"],
    queryFn: () => apiCall("/api/gacha/free-status"),
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useFreeSummon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiCall("/api/gacha/free-summon", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freeGachaStatus"] });
      queryClient.invalidateQueries({ queryKey: ["userCards"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiCall("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ key, value }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    },
  });
}

// Draws API
export function useActiveDraws() {
  return useQuery({
    queryKey: ["activeDraws"],
    queryFn: () => apiCall("/api/draws/active"),
  });
}

export function useAllDraws() {
  return useQuery({
    queryKey: ["allDraws"],
    queryFn: () => apiCall("/api/draws"),
  });
}

export function useUserDrawEntries() {
  return useQuery({
    queryKey: ["userDrawEntries"],
    queryFn: () => apiCall("/api/users/me/draw-entries"),
  });
}

export function useRecentWinners() {
  return useQuery({
    queryKey: ["recentWinners"],
    queryFn: () => apiCall("/api/draws/winners/recent"),
  });
}

export function useEnterDraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (drawId: string) =>
      apiCall(`/api/draws/${drawId}/enter`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userDrawEntries"] });
      queryClient.invalidateQueries({ queryKey: ["activeDraws"] });
      queryClient.invalidateQueries({ queryKey: ["allDraws"] });
    },
  });
}

// ========================
// FRACTURE TRIAL GAME API
// ========================

export function useGameConfig() {
  return useQuery({
    queryKey: ["gameConfig"],
    queryFn: () => apiCall("/api/game/config"),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useGameStatus() {
  return useQuery({
    queryKey: ["gameStatus"],
    queryFn: () => apiCall("/api/game/status"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useUpdateTutorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (step: 'buttons' | 'rewarded' | 'firstEarn' | 'practiceOnly') =>
      apiCall("/api/game/tutorial", {
        method: "POST",
        body: JSON.stringify({ step }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useStartGameSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { trialType: string; isPractice?: boolean }) =>
      apiCall("/api/game/start", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useCompleteGameSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessionId: string; clickCount: number; forceEnd?: boolean }) =>
      apiCall("/api/game/complete", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useClaimGameReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiCall("/api/game/claim", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useClaimSocialBonus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/game/social-bonus", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useDeclineFirstPurchaseDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/game/decline-discount", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useCreateChroniclePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiCall("/api/game/chronicle-post", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useGameHistory() {
  return useQuery({
    queryKey: ["gameHistory"],
    queryFn: () => apiCall("/api/game/history"),
  });
}

export function useGameEvents() {
  return useQuery({
    queryKey: ["gameEvents"],
    queryFn: () => apiCall("/api/game/events"),
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============ S-CLASS TRIAL & WELCOME ============

export function useSClassStatus() {
  return useQuery({
    queryKey: ["sclassStatus"],
    queryFn: () => apiCall("/api/sclass/status"),
    refetchInterval: 30000, // Check trial expiry every 30s
  });
}

export function useStartSClassTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/start-trial", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useCancelSClassTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/cancel-trial", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useConvertSClassTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/convert-trial", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["gameStatus"] });
    },
  });
}

export function useClaimSClassWelcomeReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/claim-welcome-reward", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useClaimRetentionSaveBonus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/retention-save", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useSwitchToYearly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/switch-yearly", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/cancel-subscription", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useReactivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCall("/api/sclass/reactivate", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useSubscribeSClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planType: 'monthly' | 'yearly') =>
      apiCall("/api/sclass/subscribe", { 
        method: "POST",
        body: JSON.stringify({ planType })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sclassStatus"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

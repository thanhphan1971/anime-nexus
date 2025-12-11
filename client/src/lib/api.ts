import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Helper function for API calls
async function apiCall(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
    mutationFn: (userId: string) =>
      apiCall(`/api/admin/users/${userId}/premium`, { method: "POST" }),
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

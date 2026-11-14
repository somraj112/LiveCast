import { apiRequest, authenticatedRequest } from "./auth";
import type { Category, StreamStatus } from "./streams";

export type Tag = { id: string; name: string };
export type PublicCreator = { id: string; username: string; profileImage: string | null; bio: string | null };
export type PublicStream = {
  id: string;
  title: string;
  description: string | null;
  status: Extract<StreamStatus, "LIVE" | "SCHEDULED" | "ENDED">;
  scheduledAt: string | null;
  startedAt: string | null;
  createdAt: string;
  category: Category;
  creator: PublicCreator;
  tags: Tag[];
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
export type CreatorProfile = PublicCreator & {
  createdAt: string;
  followerCount: number;
  streamCount: number;
  streams: PublicStream[];
};
export type HistoryEntry = { id: string; watchDuration: number; watchedAt: string; stream: PublicStream };

export async function listDiscoveryStreams(filters: {
  page?: number;
  limit?: number;
  status?: Array<"LIVE" | "SCHEDULED">;
  categoryId?: string;
  tags?: string[];
  search?: string;
}) {
  const query = new URLSearchParams();
  if (filters.page) query.set("page", String(filters.page));
  if (filters.limit) query.set("limit", String(filters.limit));
  if (filters.status?.length) query.set("status", filters.status.join(","));
  if (filters.categoryId) query.set("categoryId", filters.categoryId);
  if (filters.tags?.length) query.set("tags", filters.tags.join(","));
  if (filters.search) query.set("search", filters.search);
  return apiRequest<{ streams: PublicStream[]; pagination: Pagination }>(`/discovery/streams?${query}`);
}

export async function listTags() {
  return (await apiRequest<{ tags: Tag[] }>("/discovery/tags")).tags;
}

export async function getCreatorProfile(username: string) {
  return (await apiRequest<{ creator: CreatorProfile }>(`/creators/${encodeURIComponent(username)}`)).creator;
}

export async function getFollowStatus(creatorId: string) {
  return authenticatedRequest<{ following: boolean; followedAt: string | null; canFollow: boolean }>(`/creators/${creatorId}/follow-status`);
}

export async function setFollowing(creatorId: string, following: boolean) {
  return authenticatedRequest<{ following: boolean; followedAt: string | null }>(
    `/creators/${creatorId}/follow`,
    { method: following ? "POST" : "DELETE" },
  );
}

export async function listViewerHistory(page = 1) {
  return authenticatedRequest<{ history: HistoryEntry[]; pagination: Pagination }>(`/viewer/history?page=${page}&limit=12`);
}

export async function recordViewerHistory(streamId: string, watchDuration = 0) {
  return authenticatedRequest<{ history: Pick<HistoryEntry, "id" | "watchDuration" | "watchedAt"> }>(
    "/viewer/history",
    { method: "POST", body: JSON.stringify({ streamId, watchDuration }) },
  );
}

const art = ["after-hours", "form-studies", "build-log", "side-b"];
export function streamArtwork(stream: Pick<PublicStream, "id">) {
  const index = [...stream.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % art.length;
  return `/art/${art[index]}.svg`;
}

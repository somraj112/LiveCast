import { apiRequest, authenticatedRequest } from "./auth";

export type StreamStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "ENDED";
export type StreamVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export type Category = { id: string; name: string; icon: string | null };

export type CreatorStream = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  visibility: StreamVisibility;
  status: StreamStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  category: Category;
};

export type StreamInput = {
  title: string;
  description?: string | null;
  categoryId: string;
  visibility: StreamVisibility;
};

export async function listCategories() {
  return (await apiRequest<{ categories: Category[] }>("/categories")).categories;
}

export async function listCreatorStreams() {
  return (await authenticatedRequest<{ streams: CreatorStream[] }>("/creator/streams")).streams;
}

export async function createStream(input: StreamInput) {
  return (await authenticatedRequest<{ stream: CreatorStream }>("/creator/streams", {
    method: "POST",
    body: JSON.stringify(input),
  })).stream;
}

export async function updateStream(streamId: string, input: Partial<StreamInput>) {
  return (await authenticatedRequest<{ stream: CreatorStream }>(`/creator/streams/${streamId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })).stream;
}

export async function scheduleStream(streamId: string, scheduledAt: string) {
  return (await authenticatedRequest<{ stream: CreatorStream }>(
    `/creator/streams/${streamId}/schedule`,
    { method: "POST", body: JSON.stringify({ scheduledAt }) }
  )).stream;
}

export async function startStream(streamId: string) {
  return (await authenticatedRequest<{ stream: CreatorStream }>(`/creator/streams/${streamId}/start`, {
    method: "POST",
  })).stream;
}

export async function endStream(streamId: string) {
  return (await authenticatedRequest<{ stream: CreatorStream }>(`/creator/streams/${streamId}/end`, {
    method: "POST",
  })).stream;
}

export async function deleteStream(streamId: string) {
  await authenticatedRequest<void>(`/creator/streams/${streamId}`, { method: "DELETE" });
}

export async function getStreamKey(streamId: string) {
  return (await authenticatedRequest<{ id: string; streamKey: string }>(
    `/creator/streams/${streamId}/stream-key`
  )).streamKey;
}

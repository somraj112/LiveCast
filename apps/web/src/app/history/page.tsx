"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, History } from "lucide-react";
import { Button, StreamCard } from "@streamline/ui";
import { AuthApiError } from "@/lib/auth";
import { listViewerHistory, streamArtwork, type HistoryEntry, type Pagination } from "@/lib/discovery";

const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function ViewerHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const loadHistory = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await listViewerHistory(page);
      if (currentRequest !== requestId.current) return;
      setEntries(result.history);
      setPagination(result.pagination);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause instanceof AuthApiError ? cause.message : "LiveCast could not load your viewing history.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadHistory(); });
    return () => { active = false; };
  }, [loadHistory]);

  return (
    <main id="content" className="wrap history-page">
      <header className="history-heading">
        <span className="eyebrow"><History size={14} /> Viewer history</span>
        <h1>Recently <em>tuned in.</em></h1>
        <p>Broadcast details you open while signed in appear here.</p>
      </header>
      {error ? <div className="history-login"><p className="dashboard-alert" role="alert">{error}</p><Link href="/login">Log in to see your history →</Link></div> : null}
      {loading ? <p className="directory-state">Loading your history…</p> : null}
      {!loading && !error && !entries.length ? <p className="directory-state">Your history is quiet. Explore a broadcast to start it.</p> : null}
      <div className="history-grid">
        {entries.map((entry) => (
          <article key={entry.id} className="history-entry">
            <StreamCard
              thumbnail={streamArtwork(entry.stream)}
              title={entry.stream.title}
              category={entry.stream.category.name}
              creatorName={entry.stream.creator.username}
              creatorAvatar={entry.stream.creator.profileImage || undefined}
              isLive={entry.stream.status === "LIVE"}
            />
            <p><Clock3 size={14} /> Opened {formatDate.format(new Date(entry.watchedAt))}</p>
          </article>
        ))}
      </div>
      {pagination && pagination.totalPages > 1 ? (
        <nav className="pagination" aria-label="Viewer history pages">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="ghost" disabled={!pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </nav>
      ) : null}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CalendarClock, Radio, Search, SlidersHorizontal, X } from "lucide-react";
import { Button, LiveBadge, StreamCard } from "@streamline/ui";
import { AuthApiError } from "@/lib/auth";
import {
  listDiscoveryStreams,
  listTags,
  recordViewerHistory,
  streamArtwork,
  type Pagination,
  type PublicStream,
  type Tag,
} from "@/lib/discovery";
import { listCategories, type Category } from "@/lib/streams";

const emptyPagination: Pagination = { page: 1, limit: 9, total: 0, totalPages: 0, hasNextPage: false };
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Discover() {
  const [streams, setStreams] = useState<PublicStream[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [status, setStatus] = useState<"ALL" | "LIVE" | "SCHEDULED">("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PublicStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);

  const loadStreams = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await listDiscoveryStreams({
        page,
        limit: 9,
        status: status === "ALL" ? ["LIVE", "SCHEDULED"] : [status],
        categoryId: categoryId || undefined,
        tags: selectedTags,
        search: search || undefined,
      });
      if (currentRequest !== requestId.current) return;
      setStreams(result.streams);
      setPagination(result.pagination);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause instanceof AuthApiError ? cause.message : "LiveCast could not load the channel directory.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [categoryId, page, search, selectedTags, status]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadStreams(); });
    return () => { active = false; };
  }, [loadStreams]);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      try {
        const [availableCategories, availableTags] = await Promise.all([listCategories(), listTags()]);
        if (active) { setCategories(availableCategories); setTags(availableTags); }
      } catch {
        // The directory remains usable if optional filter metadata is unavailable.
      }
    });
    return () => { active = false; };
  }, []);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function openStream(stream: PublicStream) {
    setSelected(stream);
    dialog.current?.showModal();
    void recordViewerHistory(stream.id).catch(() => undefined);
  }

  function toggleTag(name: string) {
    setPage(1);
    setSelectedTags((current) => current.includes(name)
      ? current.filter((tag) => tag !== name)
      : [...current, name]);
  }

  return (
    <main id="content" className="wrap guide discovery-page">
      <div className="guide-top">
        <span className="eyebrow"><i className="signal-dot" /> Broadcast guide</span>
        <span className="edition">Live & scheduled / updated now</span>
      </div>
      <section className="discovery-hero" aria-labelledby="discovery-title">
        <div>
          <span className="feature-kicker"><Radio size={15} /> Find your next signal</span>
          <h1 id="discovery-title">What&apos;s <em>on air.</em></h1>
          <p>Search live broadcasts, plan for scheduled shows, and follow the creators you want to hear from again.</p>
        </div>
        <form className="discovery-search" onSubmit={applySearch} role="search">
          <label htmlFor="stream-search">Search streams or creators</label>
          <div>
            <Search size={18} aria-hidden="true" />
            <input id="stream-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Try music, design, or a creator" />
            <Button type="submit">Search</Button>
          </div>
        </form>
      </section>

      <section className="lineup" aria-labelledby="lineup-title">
        <div className="lineup-head">
          <div><span className="eyebrow">Channel directory</span><h2 id="lineup-title">Discover<span>.</span></h2></div>
          <span className="lineup-count" aria-live="polite">{pagination.total} broadcasts</span>
        </div>
        <div className="discovery-controls">
          <div className="filterbar" role="group" aria-label="Filter by broadcast status">
            <SlidersHorizontal size={15} aria-hidden="true" />
            {(["ALL", "LIVE", "SCHEDULED"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={status === item} onClick={() => { setPage(1); setStatus(item); }}>
                {item === "ALL" ? "All broadcasts" : item === "LIVE" ? "Live now" : "Scheduled"}
              </button>
            ))}
          </div>
          <label className="category-filter">
            Category
            <select value={categoryId} onChange={(event) => { setPage(1); setCategoryId(event.target.value); }}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        </div>
        {tags.length ? (
          <div className="tag-filter" role="group" aria-label="Filter by tag">
            {tags.map((tag) => (
              <button key={tag.id} type="button" aria-pressed={selectedTags.includes(tag.name)} onClick={() => toggleTag(tag.name)}>#{tag.name}</button>
            ))}
          </div>
        ) : null}
        {error ? <p className="dashboard-alert" role="alert">{error}</p> : null}
        {loading ? <p className="directory-state">Tuning the directory…</p> : null}
        {!loading && !streams.length ? <p className="directory-state">No broadcasts match these filters yet.</p> : null}
        <div className="stream-grid">
          {streams.map((stream) => (
            <StreamCard
              key={stream.id}
              thumbnail={streamArtwork(stream)}
              title={stream.title}
              category={stream.status === "SCHEDULED" ? `${stream.category.name} · Scheduled` : stream.category.name}
              creatorName={stream.creator.username}
              creatorAvatar={stream.creator.profileImage || undefined}
              isLive={stream.status === "LIVE"}
              onClick={() => openStream(stream)}
            />
          ))}
        </div>
        {pagination.totalPages > 1 ? (
          <nav className="pagination" aria-label="Stream directory pages">
            <Button variant="ghost" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="ghost" disabled={!pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </nav>
        ) : null}
      </section>

      <dialog ref={dialog} className="channel-dialog" aria-labelledby="channel-title" onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}>
        {selected ? <div>
          <div className="dialog-art" style={{ backgroundImage: `url(${streamArtwork(selected)})` }}>
            <button aria-label="Close channel details" autoFocus onClick={() => dialog.current?.close()}><X size={18} /></button>
          </div>
          <div className="dialog-copy">
            <div className="dialog-flags">
              <LiveBadge variant={selected.status === "LIVE" ? "live" : "offline"}>{selected.status}</LiveBadge>
              {selected.scheduledAt ? <span className="eyebrow"><CalendarClock size={13} /> {formatDate.format(new Date(selected.scheduledAt))}</span> : null}
            </div>
            <span className="eyebrow">{selected.category.name}</span>
            <h2 id="channel-title">{selected.title}</h2>
            <Link className="creator-link" href={`/creators/${selected.creator.username}`}>By {selected.creator.username} →</Link>
            <p>{selected.description || "This creator has not added a description yet."}</p>
            {selected.tags.length ? <p className="dialog-tags">{selected.tags.map((tag) => `#${tag.name}`).join("  ")}</p> : null}
            <Button variant="ghost" onClick={() => dialog.current?.close()}>Back to the guide <ArrowRight size={15} /></Button>
          </div>
        </div> : null}
      </dialog>
    </main>
  );
}

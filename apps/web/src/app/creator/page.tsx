"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarClock, Copy, KeyRound, Pencil, Radio, Square, Trash2 } from "lucide-react";
import { Button, Input } from "@streamline/ui";
import { AuthApiError, getCurrentUser, type AuthUser } from "@/lib/auth";
import {
  createStream,
  deleteStream,
  endStream,
  getStreamKey,
  listCategories,
  listCreatorStreams,
  scheduleStream,
  startStream,
  updateStream,
  prepareBroadcast,
  stopBroadcast,
  type Category,
  type CreatorStream,
  type StreamInput,
  type StreamVisibility,
} from "@/lib/streams";

const emptyForm: StreamInput = {
  title: "",
  description: "",
  categoryId: "",
  visibility: "PUBLIC",
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : "LiveCast could not complete that action.";
}

export default function CreatorDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [streams, setStreams] = useState<CreatorStream[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<StreamInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleTimes, setScheduleTimes] = useState<Record<string, string>>({});
  const [streamKeys, setStreamKeys] = useState<Record<string, string>>({});
  const [ingest, setIngest] = useState<Record<string, { ingestUrl: string; streamKey: string }>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [currentUser, creatorStreams, availableCategories] = await Promise.all([
        getCurrentUser(),
        listCreatorStreams(),
        listCategories(),
      ]);
      setUser(currentUser);
      setStreams(creatorStreams);
      setCategories(availableCategories);
      setForm((current) => current.categoryId || !availableCategories[0]
        ? current
        : { ...current, categoryId: availableCategories[0].id });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadDashboard();
    });
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  function replaceStream(next: CreatorStream) {
    setStreams((current) => current.map((stream) => stream.id === next.id ? next : stream));
  }

  async function submitStream(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setActiveAction(editingId ? `edit:${editingId}` : "create");
    try {
      if (editingId) {
        replaceStream(await updateStream(editingId, form));
      } else {
        const created = await createStream(form);
        setStreams((current) => [created, ...current]);
      }
      setEditingId(null);
      setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setActiveAction(null);
    }
  }

  function beginEdit(stream: CreatorStream) {
    setEditingId(stream.id);
    setForm({
      title: stream.title,
      description: stream.description || "",
      categoryId: stream.categoryId,
      visibility: stream.visibility,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function runTransition(streamId: string, action: "start" | "end") {
    setError("");
    setActiveAction(`${action}:${streamId}`);
    try {
      replaceStream(action === "start" ? await startStream(streamId) : await endStream(streamId));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setActiveAction(null);
    }
  }

  async function schedule(streamId: string) {
    const localTime = scheduleTimes[streamId];
    if (!localTime) {
      setError("Choose a date and time before scheduling the stream.");
      return;
    }
    setError("");
    setActiveAction(`schedule:${streamId}`);
    try {
      replaceStream(await scheduleStream(streamId, new Date(localTime).toISOString()));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setActiveAction(null);
    }
  }

  async function remove(stream: CreatorStream) {
    if (!window.confirm(`Delete “${stream.title}”? This cannot be undone.`)) return;
    setError("");
    setActiveAction(`delete:${stream.id}`);
    try {
      await deleteStream(stream.id);
      setStreams((current) => current.filter((candidate) => candidate.id !== stream.id));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setActiveAction(null);
    }
  }

  async function revealKey(streamId: string) {
    if (streamKeys[streamId]) {
      await navigator.clipboard.writeText(streamKeys[streamId]);
      return;
    }
    setError("");
    setActiveAction(`key:${streamId}`);
    try {
      const streamKey = await getStreamKey(streamId);
      setStreamKeys((current) => ({ ...current, [streamId]: streamKey }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setActiveAction(null);
    }
  }

  async function configureBroadcast(streamId: string) {
    setError("");
    setActiveAction(`broadcast:${streamId}`);
    try {
      const details = await prepareBroadcast(streamId);
      setIngest((current) => ({ ...current, [streamId]: details }));
      setStreams(await listCreatorStreams());
      setNotice("Paste the server URL and stream key into OBS, then start streaming there. Refresh the studio to see the confirmed status.");
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setActiveAction(null); }
  }

  async function stopProviderBroadcast(streamId: string) {
    setError("");
    setActiveAction(`stop:${streamId}`);
    try {
      await stopBroadcast(streamId);
      setNotice("Stop requested. Stop streaming in OBS and wait for confirmation; the recording will appear after processing.");
      setStreams(await listCreatorStreams());
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setActiveAction(null); }
  }

  return (
    <main id="content" className="wrap creator-dashboard">
      <header className="creator-heading">
        <div>
          <span className="eyebrow"><span className="signal-dot" /> Creator studio</span>
          <h1>Run the <em>broadcast.</em></h1>
          <p>{user ? `Signed in as ${user.username}.` : "Plan, schedule, and control your LiveCast streams."}</p>
        </div>
        <div className="creator-stat" aria-label={`${streams.length} streams`}>
          <strong>{streams.length}</strong>
          <span>Total streams</span>
        </div>
      </header>

      {error ? <p className="dashboard-alert" role="alert">{error}</p> : null}
      {notice ? <p className="form-notice" role="status">{notice}</p> : null}

      <section className="stream-editor" aria-labelledby="stream-editor-title">
        <div>
          <span className="eyebrow">{editingId ? "Edit broadcast" : "New broadcast"}</span>
          <h2 id="stream-editor-title">{editingId ? "Update stream details" : "Create a draft"}</h2>
          <p>Drafts stay private from public stream endpoints until you schedule or start them.</p>
        </div>
        <form onSubmit={submitStream}>
          <label>
            Title
            <Input
              required
              minLength={3}
              maxLength={150}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Friday night studio session"
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={5000}
              value={form.description || ""}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Tell viewers what to expect."
            />
          </label>
          <div className="editor-row">
            <label>
              Category
              <select
                required
                value={form.categoryId}
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              Visibility
              <select
                value={form.visibility}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  visibility: event.target.value as StreamVisibility,
                }))}
              >
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>
          </div>
          <div className="editor-actions">
            <Button type="submit" loading={activeAction === (editingId ? `edit:${editingId}` : "create")}>
              {editingId ? "Save changes" : "Create draft"}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
          {!categories.length && !loading ? (
            <small>No categories exist yet. Add a category before creating a stream.</small>
          ) : null}
        </form>
      </section>

      <section className="stream-manager" aria-labelledby="managed-streams-title">
        <div className="manager-heading">
          <div>
            <span className="eyebrow">Broadcast desk</span>
            <h2 id="managed-streams-title">Your streams</h2>
          </div>
          <Button type="button" variant="ghost" onClick={() => void loadDashboard()} loading={loading}>
            Refresh
          </Button>
        </div>

        {!loading && streams.length === 0 ? (
          <div className="empty-studio">
            <Radio aria-hidden="true" />
            <h3>No broadcasts yet</h3>
            <p>Create your first draft using the form above.</p>
          </div>
        ) : null}

        <div className="managed-stream-list">
          {streams.map((stream) => {
            const editable = stream.status === "DRAFT" || stream.status === "SCHEDULED";
            return (
              <article className="managed-stream" key={stream.id}>
                <div className="stream-summary">
                  <span className={`status-pill status-${stream.status.toLowerCase()}`}>{stream.status}</span>
                  <span>{stream.visibility}</span>
                  <span>{stream.category.name}</span>
                </div>
                <h3>{stream.title}</h3>
                <p>{stream.description || "No description provided."}</p>
                <dl>
                  <div><dt>Created</dt><dd>{dateFormatter.format(new Date(stream.createdAt))}</dd></div>
                  {stream.scheduledAt ? (
                    <div><dt>Scheduled</dt><dd>{dateFormatter.format(new Date(stream.scheduledAt))}</dd></div>
                  ) : null}
                  {stream.startedAt ? (
                    <div><dt>Started</dt><dd>{dateFormatter.format(new Date(stream.startedAt))}</dd></div>
                  ) : null}
                </dl>

                {editable ? (
                  <div className="schedule-row">
                    <label htmlFor={`schedule-${stream.id}`}>Schedule start</label>
                    <Input
                      id={`schedule-${stream.id}`}
                      type="datetime-local"
                      value={scheduleTimes[stream.id] || ""}
                      onChange={(event) => setScheduleTimes((current) => ({
                        ...current,
                        [stream.id]: event.target.value,
                      }))}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      loading={activeAction === `schedule:${stream.id}`}
                      onClick={() => void schedule(stream.id)}
                      icon={<CalendarClock size={15} />}
                    >
                      Schedule
                    </Button>
                  </div>
                ) : null}

                {ingest[stream.id] ? <div className="stream-key">
                  <span>OBS server</span><code>{ingest[stream.id].ingestUrl}</code>
                  <span>Private ingest key</span><code>{ingest[stream.id].streamKey}</code>
                  <small>Anyone with this key can broadcast to your channel. Keep it secret.</small>
                  <Button variant="ghost" onClick={() => setIngest((current) => { const next = { ...current }; delete next[stream.id]; return next; })}>Hide ingest details</Button>
                </div> : null}
                {streamKeys[stream.id] && !stream.broadcast ? (
                  <div className="stream-key" role="status">
                    <span>Private stream key</span>
                    <code>{streamKeys[stream.id]}</code>
                    <small>Keep this key private. Select “Copy key” again to copy it.</small>
                  </div>
                ) : null}

                <div className="stream-actions">
                  {stream.status !== "DRAFT" ? <Link className="lc-button lc-button--ghost" href={`/streams/${stream.id}`}>Watch broadcast</Link> : null}
                  {editable || (stream.status === "LIVE" && stream.broadcast && !stream.broadcast.stopRequested) ? <Button
                    loading={activeAction === `broadcast:${stream.id}`} onClick={() => void configureBroadcast(stream.id)}
                  >{stream.broadcast ? "Show OBS setup" : "Set up OBS broadcast"}</Button> : null}
                  {stream.broadcast && stream.status === "LIVE" ? <Button variant="secondary" loading={activeAction === `stop:${stream.id}`} onClick={() => void stopProviderBroadcast(stream.id)}>Stop broadcast</Button> : null}
                  {editable ? (
                    <Button type="button" variant="ghost" onClick={() => beginEdit(stream)} icon={<Pencil size={15} />}>
                      Edit
                    </Button>
                  ) : null}
                  {editable && !stream.broadcast ? (
                    <Button
                      type="button"
                      loading={activeAction === `start:${stream.id}`}
                      onClick={() => void runTransition(stream.id, "start")}
                      icon={<Radio size={15} />}
                    >
                      Start demo room
                    </Button>
                  ) : null}
                  {stream.status === "LIVE" && !stream.broadcast ? (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={activeAction === `end:${stream.id}`}
                      onClick={() => void runTransition(stream.id, "end")}
                      icon={<Square size={14} />}
                    >
                      End stream
                    </Button>
                  ) : null}
                  {!stream.broadcast ? <Button
                    type="button"
                    variant="ghost"
                    loading={activeAction === `key:${stream.id}`}
                    onClick={() => void revealKey(stream.id)}
                    icon={streamKeys[stream.id] ? <Copy size={15} /> : <KeyRound size={15} />}
                  >
                    {streamKeys[stream.id] ? "Copy key" : "Reveal key"}
                  </Button> : null}
                  {stream.status !== "LIVE" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="danger-action"
                      loading={activeAction === `delete:${stream.id}`}
                      onClick={() => void remove(stream)}
                      icon={<Trash2 size={15} />}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

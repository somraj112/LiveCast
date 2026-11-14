"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Radio, UserCheck, UserPlus } from "lucide-react";
import { Button, StreamCard } from "@streamline/ui";
import { AuthApiError } from "@/lib/auth";
import {
  getCreatorProfile,
  getFollowStatus,
  setFollowing,
  streamArtwork,
  type CreatorProfile,
} from "@/lib/discovery";

export default function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [following, setFollowingState] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await getCreatorProfile(username);
      setCreator(profile);
      try {
        const follow = await getFollowStatus(profile.id);
        setFollowingState(follow.following);
        setCanFollow(follow.canFollow);
        setAuthenticated(true);
      } catch {
        setCanFollow(false);
        setAuthenticated(false);
      }
    } catch (cause) {
      setError(cause instanceof AuthApiError ? cause.message : "LiveCast could not load this creator.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadProfile(); });
    return () => { active = false; };
  }, [loadProfile]);

  async function toggleFollow() {
    if (!creator) return;
    setSaving(true);
    setError("");
    try {
      const result = await setFollowing(creator.id, !following);
      setFollowingState(result.following);
      setCreator((current) => current ? {
        ...current,
        followerCount: Math.max(0, current.followerCount + (result.following ? 1 : -1)),
      } : current);
    } catch (cause) {
      setError(cause instanceof AuthApiError ? cause.message : "LiveCast could not update this follow.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main id="content" className="wrap profile-page"><p className="directory-state">Loading creator profile…</p></main>;
  if (!creator) return <main id="content" className="wrap profile-page"><p className="dashboard-alert" role="alert">{error || "Creator not found."}</p></main>;

  return (
    <main id="content" className="wrap profile-page">
      <header className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">{creator.username.slice(0, 2).toUpperCase()}</div>
        <div>
          <span className="eyebrow"><Radio size={14} /> Creator frequency</span>
          <h1>{creator.username}<span>.</span></h1>
          <p>{creator.bio || "Independent broadcasts, live on LiveCast."}</p>
          <dl className="profile-stats">
            <div><dt>Followers</dt><dd>{creator.followerCount}</dd></div>
            <div><dt>Streams</dt><dd>{creator.streamCount}</dd></div>
          </dl>
        </div>
        <div className="profile-action">
          {canFollow ? (
            <Button onClick={toggleFollow} loading={saving} variant={following ? "ghost" : "primary"}>
              {following ? <UserCheck size={17} /> : <UserPlus size={17} />}
              {following ? "Following" : "Follow creator"}
            </Button>
          ) : authenticated
            ? <span className="eyebrow">Your creator profile</span>
            : <Link href="/login" className="lc-button lc-button--primary">Log in to follow</Link>}
        </div>
      </header>
      {error ? <p className="dashboard-alert" role="alert">{error}</p> : null}
      <section className="profile-streams" aria-labelledby="creator-streams-title">
        <div className="lineup-head"><div><span className="eyebrow">Recent broadcasts</span><h2 id="creator-streams-title">The archive<span>.</span></h2></div></div>
        {!creator.streams.length ? <p className="directory-state">No public broadcasts yet.</p> : null}
        <div className="stream-grid">
          {creator.streams.map((stream) => (
            <StreamCard
              key={stream.id}
              thumbnail={streamArtwork(stream)}
              title={stream.title}
              category={`${stream.category.name} · ${stream.status}`}
              creatorName={creator.username}
              creatorAvatar={creator.profileImage || undefined}
              isLive={stream.status === "LIVE"}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

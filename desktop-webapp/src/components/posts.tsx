import {
  BarChart3,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share2,
  Trash2,
  UserMinus,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { markets } from "../services/data";
import { useApp } from "../store/AppStore";
import type { Post } from "../types";
import { Avatar, Button, IconButton, Modal } from "./ui";
import { shareLink } from "../utils/browser";

const compact = (n: number) =>
  n >= 1000000
    ? `${(n / 1000000).toFixed(1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
      : String(n);
const elapsed = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1
    ? "now"
    : min < 60
      ? `${min}m`
      : min < 1440
        ? `${Math.floor(min / 60)}h`
        : `${Math.floor(min / 1440)}d`;
};

export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const { posts, users, updatePost, deletePost, updateUser, toast } = useApp();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(post.content);
  const author = users.find((u) => u.id === post.authorId)!;
  const market = markets.find((m) => m.id === post.marketId);
  const quoted = posts.find((p) => p.id === post.quotePostId);
  const toggle = (key: "liked" | "saved", count?: "likes") => {
    const active = post[key];
    updatePost(post.id, {
      [key]: !active,
      ...(count
        ? { [count]: Math.max(0, post[count] + (active ? -1 : 1)) }
        : {}),
    });
  };
  return (
    <article className={`post-card ${detail ? "post-card--detail" : ""}`}>
      <Avatar name={author.displayName} />
      <div className="post-body">
        <header>
          <button onClick={() => navigate(`/app/posts/profile/${author.id}`)}>
            <strong>{author.displayName}</strong>
            <span>
              @{author.username} · {elapsed(post.createdAt)}
            </span>
          </button>
          <IconButton label="Post options" onClick={() => setMenu(!menu)}>
            <MoreHorizontal />
          </IconButton>
          {menu && (
            <div className="post-menu">
              {author.isCurrent ? (
                <>
                  <button
                    onClick={() => {
                      setEdit(true);
                      setMenu(false);
                    }}
                  >
                    Edit post
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      deletePost(post.id);
                      toast("Post deleted");
                    }}
                  >
                    <Trash2 /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      updateUser(author.id, {
                        isFollowing: !author.isFollowing,
                        followers:
                          author.followers + (author.isFollowing ? -1 : 1),
                      });
                      setMenu(false);
                    }}
                  >
                    <UserMinus /> {author.isFollowing ? "Unfollow" : "Follow"} @
                    {author.username}
                  </button>
                  <button
                    onClick={() => {
                      toast(`Muted @${author.username}`);
                      setMenu(false);
                    }}
                  >
                    <VolumeX /> Mute
                  </button>
                  <button
                    onClick={() => {
                      toast(`Blocked @${author.username}`);
                      setMenu(false);
                    }}
                  >
                    Block user
                  </button>
                  <button
                    onClick={() => {
                      toast("Report submitted for review");
                      setMenu(false);
                    }}
                  >
                    Report post
                  </button>
                </>
              )}
            </div>
          )}
        </header>
        <p className="post-copy">{post.content}</p>
        {market && (
          <button
            className="post-attachment market-attachment"
            onClick={() => navigate(`/app/market/${market.id}`)}
          >
            <span className="token bitcoin">
              {market.category === "Crypto" ? "₿" : market.title[0]}
            </span>
            <div>
              <small>{market.category} market</small>
              <strong>{market.title}</strong>
              <span>
                {market.outcomes[0]?.probability}% leading · {market.volume}{" "}
                volume
              </span>
            </div>
            <BarChart3 />
          </button>
        )}
        {post.position && (
          <div className="post-attachment position-card">
            <div>
              <small>Public position</small>
              <strong>
                {post.position.symbol} · {post.position.name}
              </strong>
            </div>
            <div className="position-metrics">
              <span>
                Entry <b>${post.position.entry.toLocaleString()}</b>
              </span>
              <span>
                Current <b>${post.position.current.toLocaleString()}</b>
              </span>
              <span>
                Performance{" "}
                <b
                  className={
                    post.position.performance >= 0 ? "positive" : "negative"
                  }
                >
                  {post.position.performance >= 0 ? "+" : ""}
                  {post.position.performance.toFixed(2)}%
                </b>
              </span>
            </div>
          </div>
        )}
        {post.portfolio && (
          <div className="post-attachment portfolio-card">
            <header>
              <div>
                <small>Public portfolio · 30D</small>
                <strong>Transparent performance</strong>
              </div>
              <b className="positive">+18.42%</b>
            </header>
            {post.portfolio.map((p) => (
              <div key={p.symbol}>
                <span>{p.symbol}</span>
                <small>{p.allocation}% allocation</small>
                <b className={p.performance >= 0 ? "positive" : "negative"}>
                  {p.performance >= 0 ? "+" : ""}
                  {p.performance.toFixed(1)}%
                </b>
              </div>
            ))}
          </div>
        )}
        {post.ai && (
          <div className="post-attachment ai-attachment">
            <div className="ai-heading">
              <span>
                <BarChart3 />
              </span>
              <div>
                <small>PredictAI Intelligence</small>
                <strong>{post.ai.probability}% model probability</strong>
              </div>
              <b>+{post.ai.edge} edge</b>
            </div>
            <p>{post.ai.summary}</p>
          </div>
        )}
        {quoted && (
          <div className="quoted">
            <PostMini post={quoted} />
          </div>
        )}
        <div className="social-actions">
          <button
            className={post.liked ? "active" : ""}
            onClick={() => toggle("liked", "likes")}
          >
            <Heart /> {compact(post.likes)}
          </button>
          <button onClick={() => navigate(`/app/posts/${post.id}`)}>
            <MessageCircle /> {compact(post.replies)}
          </button>
          <button
            className={post.reposted ? "active" : ""}
            onClick={() => {
              if (!post.reposted)
                updatePost(post.id, {
                  reposted: true,
                  reposts: post.reposts + 1,
                });
            }}
          >
            <Repeat2 /> {compact(post.reposts)}
          </button>
          <button
            className={post.saved ? "active" : ""}
            onClick={() => toggle("saved")}
          >
            <Bookmark />
          </button>
          <button
            onClick={() =>
              void shareLink(
                `${author.displayName} on PredictAI`,
                `${location.origin}/app/posts/${post.id}`,
              ).then((result) =>
                toast(result === "shared" ? "Post shared" : "Post link copied", "success"),
              )
            }
          >
            <Share2 />
          </button>
        </div>
      </div>
      <Modal title="Edit post" open={edit} onClose={() => setEdit(false)}>
        <textarea
          className="composer-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
        />
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setEdit(false)}>
            Cancel
          </Button>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              updatePost(post.id, { content: text.trim() });
              setEdit(false);
              toast("Post updated", "success");
            }}
          >
            Save changes
          </Button>
        </div>
      </Modal>
    </article>
  );
}

function PostMini({ post }: { post: Post }) {
  const { users } = useApp();
  const author = users.find((u) => u.id === post.authorId)!;
  return (
    <div>
      <strong>
        {author.displayName} <span>@{author.username}</span>
      </strong>
      <p>{post.content}</p>
    </div>
  );
}

export function SuggestedUsers() {
  const { users, updateUser } = useApp();
  return (
    <div className="content-card suggested">
      <h3>Who to follow</h3>
      {users
        .filter((u) => !u.isCurrent)
        .slice(0, 4)
        .map((u) => (
          <div key={u.id}>
            <Link to={`/app/posts/profile/${u.id}`}>
              <Avatar name={u.displayName} size="sm" />
              <span>
                <strong>{u.displayName}</strong>
                <small>@{u.username}</small>
              </span>
            </Link>
            <Button
              variant={u.isFollowing ? "secondary" : "primary"}
              onClick={() =>
                updateUser(u.id, {
                  isFollowing: !u.isFollowing,
                  followers: u.followers + (u.isFollowing ? -1 : 1),
                })
              }
            >
              {u.isFollowing ? "Following" : "Follow"}
            </Button>
          </div>
        ))}
    </div>
  );
}

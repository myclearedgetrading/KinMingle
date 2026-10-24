"use client";

import { useState } from "react";
import type { PostDTO } from "@/lib/types";
import { PostCard } from "./post-card";

export function ProfileFeed({ initialPosts }: { initialPosts: PostDTO[] }) {
  const [posts, setPosts] = useState(initialPosts);
  if (posts.length === 0) return <p className="text-sm text-muted">No updates in this circle yet.</p>;
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onChange={(next) => setPosts((current) => current.map((item) => (item.id === next.id ? next : item)))}
          onDelete={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
        />
      ))}
    </div>
  );
}

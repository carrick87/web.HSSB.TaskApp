"use client";

import { useEffect, useState } from "react";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

export function FileAnswerView({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const apiUrl = `/api/files/signed?path=${encodeURIComponent(path)}`;
    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load file");
        return res.json();
      })
      .then((data: { url?: string }) => setUrl(data?.url ?? null))
      .catch(() => setError("Failed to load file"));
  }, [path]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  if (error) {
    return <span className="text-atlassian-red">{error}</span>;
  }
  if (!url) {
    return <span className="text-neutral-600 animate-pulse">Loading…</span>;
  }

  const isImage = IMAGE_EXT.test(path);
  if (isImage) {
    return (
      <span className="block mt-2">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="inline-block rounded border border-neutral-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <img
            src={url}
            alt="Uploaded"
            className="w-24 h-24 sm:w-28 sm:h-28 object-cover hover:opacity-90 transition-opacity"
          />
        </button>
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="View image"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white/90 hover:text-white text-2xl leading-none p-2"
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={url}
              alt="Uploaded (enlarged)"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-700 hover:underline"
    >
      View file
    </a>
  );
}

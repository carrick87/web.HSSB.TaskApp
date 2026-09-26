"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Task } from "@/types/database.types";

interface TaskAttachmentsProps {
  task: Task;
  canUpload: boolean;
}

export function TaskAttachments({ task, canUpload }: TaskAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const filePath = `${task.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: task.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      window.location.reload();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(filePath: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(filePath, 60);

      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleDelete(attachmentId: string, filePath: string) {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      await supabase.storage
        .from("task-attachments")
        .remove([filePath]);

      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      window.location.reload();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-atlassian-red-light border border-red-200 rounded-atlassian text-sm text-atlassian-red">
            {error}
          </div>
        )}

        {task.attachments && task.attachments.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {task.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-atlassian"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-1000 truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-neutral-700">
                    {formatFileSize(attachment.file_size)} •{" "}
                    {new Date(attachment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                    className="text-sm text-brand-700 hover:text-brand-800 hover:underline font-medium"
                  >
                    Download
                  </button>
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(attachment.id, attachment.file_path)}
                      className="text-sm text-atlassian-red hover:underline font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-700 text-sm mb-4">
            No attachments yet.
          </p>
        )}

        {canUpload && (
          <div>
            <label className="block">
              <input
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploading}
                onClick={() => {
                  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                  input?.click();
                }}
              >
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </label>
            <p className="text-xs text-neutral-700 mt-2">
              Max file size: 10MB
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

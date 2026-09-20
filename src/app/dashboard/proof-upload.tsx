"use client";

import { useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/ui";
import {
  ACCEPT_ATTRIBUTE,
  MAX_PROOF_BYTES,
  WINNER_PROOF_BUCKET,
  describeSizeLimit,
  isAcceptedProofType,
  proofObjectPath,
} from "@/lib/storage";
import { createClient } from "@/utils/supabase/client";

import { attachProof } from "./actions";

/**
 * Uploads a score screenshot for a winning entry (PRD §09).
 *
 * The file goes browser → Supabase Storage directly. Routing it through a
 * Server Action would hit the default 1 MB body limit, and a phone screenshot
 * is routinely larger than that. Once storage accepts the object, a Server
 * Action records the path against the win, re-checking ownership server-side.
 */
export function ProofUpload({
  winnerId,
  userId,
  hasProof,
}: {
  winnerId: string;
  userId: string;
  hasProof: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function upload(file: File) {
    setError(undefined);
    setNotice(undefined);

    if (!isAcceptedProofType(file.type)) {
      setError("Upload a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError(`That file is larger than ${describeSizeLimit()}.`);
      return;
    }

    const supabase = createClient();
    const objectPath = proofObjectPath(userId, winnerId, file.type);

    const { error: uploadError } = await supabase.storage
      .from(WINNER_PROOF_BUCKET)
      .upload(objectPath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError(
        /bucket not found/i.test(uploadError.message)
          ? `The "${WINNER_PROOF_BUCKET}" storage bucket does not exist yet. Run supabase/winner-proofs-bucket.sql.`
          : `Upload failed: ${uploadError.message}`,
      );
      return;
    }

    const formData = new FormData();
    formData.set("winner_id", winnerId);
    formData.set("object_path", objectPath);

    const result = await attachProof({}, formData);
    if (result.error) setError(result.error);
    if (result.notice) setNotice(result.notice);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // Must be an async callback: passing a sync function that merely *starts*
    // the upload would clear `isPending` immediately, so the button would stop
    // saying "Uploading…" while the file was still in flight.
    startTransition(async () => {
      await upload(file);
    });
    // Let the same file be re-picked after a failure.
    event.target.value = "";
  }

  return (
    <div className="mt-4 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={onFileChange}
        className="sr-only"
        id={`proof-${winnerId}`}
        disabled={isPending}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={`proof-${winnerId}`}
          className={`border-line hover:border-ember hover:text-ember inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors duration-200 ${
            isPending ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {isPending
            ? "Uploading…"
            : hasProof
              ? "Replace proof"
              : "Upload score screenshot"}
        </label>

        {fileName && !error ? (
          <span className="text-ink-faint truncate text-xs">{fileName}</span>
        ) : null}
      </div>

      <p className="text-ink-faint text-xs">
        PNG, JPEG or WebP, up to {describeSizeLimit()}. Only you and an
        administrator can view it.
      </p>

      <FormMessage error={error} notice={notice} />
    </div>
  );
}

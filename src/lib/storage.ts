/**
 * Winner proof uploads (PRD §09).
 *
 * The bucket is PRIVATE. `winners.proof_url` therefore stores the object
 * *path*, not a public URL, and the dashboard mints a short-lived signed URL
 * when it needs to show the image. A public bucket would make every member's
 * score screenshot readable by anyone who guessed the URL.
 *
 * Run `supabase/winner-proofs-bucket.sql` once to create the bucket and its
 * access policies.
 */

export const WINNER_PROOF_BUCKET = "winner-proofs";

export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_PROOF_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_PROOF_TYPES.join(",");

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function isAcceptedProofType(type: string) {
  return (ACCEPTED_PROOF_TYPES as readonly string[]).includes(type);
}

/**
 * Object path for a proof.
 *
 * The leading `<userId>/` segment is what the storage policies match on, so a
 * member can only ever write inside their own folder.
 */
export function proofObjectPath(
  userId: string,
  winnerId: string,
  mimeType: string,
) {
  const ext = EXTENSIONS[mimeType] ?? "bin";
  return `${userId}/${winnerId}-${Date.now()}.${ext}`;
}

export function describeSizeLimit() {
  return `${Math.round(MAX_PROOF_BYTES / (1024 * 1024))} MB`;
}

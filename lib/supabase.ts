import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 * 
 * Provides storage for photos, 3D models, environments, and audio files
 */

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

// Create Supabase client for client-side usage
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Create Supabase client with service role for server-side usage
export const getServiceRoleClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  PHOTOS: "photos",
  ENVIRONMENTS: "environments",
  MODELS: "models",
  AUDIO: "audio",
} as const;

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: File | Blob | Buffer,
  contentType?: string
): Promise<{ url: string; path: string }> {
  const bucketName = STORAGE_BUCKETS[bucket];
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Upload from URL (for AI-generated content)
 */
export async function uploadFromUrl(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  url: string,
  contentType?: string
): Promise<{ url: string; path: string }> {
  // Fetch the file from URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
  }

  const blob = await response.blob();
  return uploadFile(bucket, path, blob, contentType || response.headers.get("content-type") || undefined);
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: keyof typeof STORAGE_BUCKETS, path: string): string {
  const bucketName = STORAGE_BUCKETS[bucket];
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: keyof typeof STORAGE_BUCKETS, path: string): Promise<void> {
  const bucketName = STORAGE_BUCKETS[bucket];
  const { error } = await supabase.storage.from(bucketName).remove([path]);
  
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}


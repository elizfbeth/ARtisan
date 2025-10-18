import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Photo Upload API Route
 * 
 * Handles photo uploads from the frontend:
 * 1. Receives photo file
 * 2. Uploads to Supabase storage
 * 3. Creates scene in Convex
 * 4. Triggers scene generation workflow
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No photo file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    console.log("Uploading photo:", file.name, file.type, file.size);

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const storagePath = `${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;

    // Upload to Supabase
    const { url: photoUrl, path: photoStoragePath } = await uploadFile(
      "PHOTOS",
      storagePath,
      file,
      file.type
    );

    console.log("Photo uploaded to Supabase:", photoUrl);

    // Create scene in Convex
    const sceneId = await convex.mutation(api.scenes.createScene, {
      photoUrl,
      photoStoragePath,
      userId: userId || undefined,
    });

    console.log("Scene created in Convex:", sceneId);

    // Trigger scene generation workflow
    // Note: This will be handled asynchronously
    await convex.action(api.workflows.generateSceneWorkflow, {
      sceneId,
      photoUrl,
    });

    console.log("Scene generation workflow triggered");

    return NextResponse.json({
      success: true,
      sceneId,
      photoUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check upload status
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sceneId = searchParams.get("sceneId");

  if (!sceneId) {
    return NextResponse.json(
      { error: "Scene ID is required" },
      { status: 400 }
    );
  }

  try {
    const scene = await convex.query(api.scenes.getScene, {
      sceneId: sceneId as any, // Type assertion for ID
    });

    return NextResponse.json({
      success: true,
      scene,
    });
  } catch (error) {
    console.error("Error fetching scene:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch scene",
      },
      { status: 500 }
    );
  }
}


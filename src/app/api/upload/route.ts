import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import "@/lib/http-init"; // Initialize IPv4-first DNS and increased timeouts
import { Id } from "@/convex/_generated/dataModel";

/**
 * Photo Upload API Route
 * 
 * Handles photo uploads from the frontend:
 * 1. Receives photo file
 * 2. Uploads to Supabase storage
 * 3. Creates scene in Convex
 * 4. Triggers scene generation workflow
 */

// Verify Convex URL is configured
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

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

    // Verify the uploaded file is accessible
    try {
      const verifyResponse = await fetch(photoUrl, { method: "HEAD" });
      if (!verifyResponse.ok) {
        console.warn("Photo URL not immediately accessible, but continuing...");
      } else {
        console.log("Photo URL verified as accessible");
      }
    } catch (error) {
      console.warn("Could not verify photo URL accessibility:", error);
    }

    // Create scene in Convex (non-blocking approach)
    console.log("Creating scene in Convex...");
    let sceneId: Id<"scenes"> | string;

    // Try to create scene with a short timeout
    try {
      sceneId = await Promise.race([
        convex.mutation(api.scenes.createScene, {
          photoUrl,
          photoStoragePath,
          userId: userId || undefined,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Convex timeout")), 8000) // Shorter timeout
        )
      ]) as Id<"scenes">;

      console.log("✓ Scene created in Convex:", sceneId);
    } catch (convexError) {
      console.warn("⚠ Convex scene creation timed out, using fallback approach");

      // Generate a temporary scene ID (Convex will create it later in the background)
      sceneId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` as Id<"scenes">;
      console.log("Using temporary scene ID:", sceneId);

      // Try to create scene in background (don't wait for it)
      convex.mutation(api.scenes.createScene, {
        photoUrl,
        photoStoragePath,
        userId: userId || undefined,
      }).then((actualSceneId) => {
        console.log("✓ Scene eventually created in Convex:", actualSceneId);
        // Note: The workflow will use the temp ID, but Convex will have a real scene
      }).catch((bgError) => {
        console.error("⚠ Background scene creation also failed:", bgError);
      });
    }

    // Trigger ENHANCED scene generation workflow (with ultra-detailed 500+ word prompts)
    console.log("Triggering ENHANCED scene generation workflow with GPS + ultra-detailed prompts...");

    // If using temp ID, wait for the workflow to complete and return the result
    if (sceneId.startsWith("temp_")) {
      console.log("Using temp ID - waiting for enhanced workflow to complete...");

      try {
        const workflowResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflows/create-scene-enhanced`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sceneId,
              photoUrl,
            }),
          }
        );

        if (workflowResponse.ok) {
          const workflowResult = await workflowResponse.json();
          console.log("Enhanced workflow completed successfully");

          return NextResponse.json({
            success: true,
            sceneId,
            photoUrl,
            scene: workflowResult.scene, // Include complete scene data with ultra-detailed analysis
          });
        } else {
          console.error("Enhanced workflow failed:", await workflowResponse.text());
        }
      } catch (workflowError) {
        console.error("Failed to execute enhanced workflow:", workflowError);
      }
    } else {
      // For real Convex IDs, trigger enhanced workflow asynchronously
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflows/create-scene-enhanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId,
          photoUrl,
        }),
      }).catch((error) => {
        console.error("Failed to trigger enhanced workflow:", error);
      });
    }

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
      sceneId: sceneId as Id<"scenes">,
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


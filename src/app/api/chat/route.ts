import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/ai-clients";

/**
 * Chat API Route
 * 
 * Handles AI-powered chat interactions:
 * - Scene-aware responses using Groq
 * - Context-aware answers about objects and environment
 * - Navigation and interaction help
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Generate response using Groq
    const response = await generateChatResponse(message, context, history);

    return NextResponse.json({
      response,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate response",
      },
      { status: 500 }
    );
  }
}






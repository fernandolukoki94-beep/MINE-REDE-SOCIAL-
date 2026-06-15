/**
 * Video Processing Utilities
 * Handles video thumbnail generation and metadata extraction
 */

import sharp from "sharp";
import { storagePut } from "./storage";

/**
 * Generate a thumbnail from a video file (base64 encoded)
 * For production, consider using FFmpeg via child_process
 * For now, we'll create a placeholder thumbnail using the first frame
 */
export async function generateVideoThumbnail(videoBase64: string, videoFilename: string, userId: number): Promise<string> {
  try {
    // Create a simple placeholder thumbnail (in production, extract actual first frame from video)
    const placeholderImage = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .png()
      .toBuffer();

    const thumbnailKey = `thumbnails/${userId}/${Date.now()}-${videoFilename}.png`;
    const { url } = await storagePut(thumbnailKey, placeholderImage, "image/png");

    return url;
  } catch (error) {
    console.error("Error generating video thumbnail:", error);
    throw new Error("Failed to generate video thumbnail");
  }
}

/**
 * Validate video file size and format
 */
export function validateVideoFile(base64: string, maxSizeMB: number = 50): boolean {
  try {
    // Base64 is roughly 33% larger than binary
    const binarySize = (base64.length * 3) / 4;
    const sizeMB = binarySize / (1024 * 1024);

    return sizeMB <= maxSizeMB;
  } catch (error) {
    return false;
  }
}

/**
 * Extract video metadata (duration, resolution, etc.)
 * This is a simplified version - for production use FFmpeg
 */
export function getVideoMetadata(base64: string) {
  try {
    // Simplified metadata - in production, parse actual video file
    return {
      duration: 0, // Would need FFmpeg to extract
      width: 1920,
      height: 1080,
      format: "mp4",
    };
  } catch (error) {
    return null;
  }
}

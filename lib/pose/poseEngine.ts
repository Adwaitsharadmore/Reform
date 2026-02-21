"use client";

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const VERSION = "0.10.14"; // stable tasks-vision version
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export async function createPoseLandmarker() {
  try {
    console.log(`[PoseEngine] Loading MediaPipe WASM from version ${VERSION}...`);
    const vision = await FilesetResolver.forVisionTasks(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
    );
    console.log("[PoseEngine] WASM loaded ✅");

    console.log(`[PoseEngine] Loading pose model from ${MODEL_URL}...`);
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    console.log("[PoseEngine] Pose model loaded successfully ✅");
    
    return landmarker;
  } catch (error) {
    console.error("[PoseEngine] Failed to load pose model ❌", error);
    throw error;
  }
}
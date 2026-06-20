import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "0.10.35";

export async function createPoseLandmarker() {
  // Version-pinned WASM avoids a moving CDN target changing runtime behavior.
  const fileset = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
  );

  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: "/models/pose_landmarker_lite.task",
      // GPU delegate is the main reason the frame loop can stay close to 30 FPS.
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    outputSegmentationMasks: false,
  });
}

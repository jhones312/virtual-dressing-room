import type { Landmark, NormalizedLandmark } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import type { GarmentFitProfile } from "./types";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

type VideoCoverMapping = {
  sourceWidth: number;
  sourceHeight: number;
  viewWidth: number;
  viewHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type GarmentFitInput = {
  group: THREE.Group;
  landmarks: NormalizedLandmark[];
  worldLandmarks?: Landmark[];
  mapping: VideoCoverMapping;
  profile: GarmentFitProfile;
  mirrored: boolean;
};

export function createCoverMapping(params: {
  sourceWidth: number;
  sourceHeight: number;
  viewWidth: number;
  viewHeight: number;
}): VideoCoverMapping {
  const scale = Math.max(
    params.viewWidth / params.sourceWidth,
    params.viewHeight / params.sourceHeight,
  );

  return {
    ...params,
    scale,
    offsetX: (params.viewWidth - params.sourceWidth * scale) / 2,
    offsetY: (params.viewHeight - params.sourceHeight * scale) / 2,
  };
}

export function applyGarmentFit({
  group,
  landmarks,
  worldLandmarks,
  mapping,
  profile,
  mirrored,
}: GarmentFitInput) {
  if (!hasReliableTorso(landmarks)) {
    group.visible = false;
    return;
  }

  group.visible = true;

  // Convert normalized MediaPipe image coordinates into the same orthographic
  // coordinate space used by the Three.js canvas. This includes object-fit:cover.
  const leftShoulder = toCanvasPoint(landmarks[LEFT_SHOULDER], mapping, mirrored);
  const rightShoulder = toCanvasPoint(landmarks[RIGHT_SHOULDER], mapping, mirrored);
  const leftHip = toCanvasPoint(landmarks[LEFT_HIP], mapping, mirrored);
  const rightHip = toCanvasPoint(landmarks[RIGHT_HIP], mapping, mirrored);

  const shoulderCenter = midpoint(leftShoulder, rightShoulder);
  const hipCenter = midpoint(leftHip, rightHip);
  const anchor = shoulderCenter.clone().lerp(hipCenter, profile.anchorDown);

  const measuredShoulderWidth = leftShoulder.distanceTo(rightShoulder);
  const measuredTorsoLength = shoulderCenter.distanceTo(hipCenter);

  // Screen-space scaling is deliberate: apparent pixel distance already encodes
  // body size and camera distance, which is what a mirror overlay must match.
  const targetScaleX = (measuredShoulderWidth * profile.fitX) / profile.localShoulderWidth;
  const targetScaleY = (measuredTorsoLength * profile.fitY) / profile.localTorsoLength;
  const targetScaleZ = Math.sqrt(targetScaleX * targetScaleY) * profile.fitZ;

  // Shoulder slope gives roll. World landmarks add a modest yaw approximation
  // when one shoulder is closer to camera than the other.
  const roll = Math.atan2(
    rightShoulder.y - leftShoulder.y,
    rightShoulder.x - leftShoulder.x,
  );
  const yaw = estimateYaw(worldLandmarks, mirrored);

  smoothTransform(group, {
    position: anchor,
    scale: new THREE.Vector3(targetScaleX, targetScaleY, targetScaleZ),
    rotation: new THREE.Euler(0, yaw, roll, "XYZ"),
  });
}

function hasReliableTorso(landmarks: NormalizedLandmark[]) {
  return [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP].every((index) => {
    const landmark = landmarks[index];
    return landmark && (landmark.visibility ?? 1) >= 0.55;
  });
}

function toCanvasPoint(
  landmark: NormalizedLandmark,
  mapping: VideoCoverMapping,
  mirrored: boolean,
) {
  const imageX = (mirrored ? 1 - landmark.x : landmark.x) * mapping.sourceWidth;
  const imageY = landmark.y * mapping.sourceHeight;

  const coveredX = imageX * mapping.scale + mapping.offsetX;
  const coveredY = imageY * mapping.scale + mapping.offsetY;

  return new THREE.Vector3(
    coveredX - mapping.viewWidth / 2,
    mapping.viewHeight / 2 - coveredY,
    0,
  );
}

function midpoint(a: THREE.Vector3, b: THREE.Vector3) {
  return a.clone().add(b).multiplyScalar(0.5);
}

function estimateYaw(worldLandmarks: Landmark[] | undefined, mirrored: boolean) {
  if (!worldLandmarks?.[LEFT_SHOULDER] || !worldLandmarks?.[RIGHT_SHOULDER]) {
    return 0;
  }

  const left = worldLandmarks[LEFT_SHOULDER];
  const right = worldLandmarks[RIGHT_SHOULDER];
  const shoulderWidth = Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);

  if (shoulderWidth < 0.001) {
    return 0;
  }

  const depthDelta = (right.z - left.z) / shoulderWidth;
  const yaw = THREE.MathUtils.clamp(depthDelta * 0.75, -0.6, 0.6);
  return mirrored ? -yaw : yaw;
}

function smoothTransform(
  group: THREE.Group,
  target: {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    rotation: THREE.Euler;
  },
) {
  const smoothing = 0.32;
  const targetQuaternion = new THREE.Quaternion().setFromEuler(target.rotation);

  group.position.lerp(target.position, smoothing);
  group.scale.lerp(target.scale, smoothing);
  group.quaternion.slerp(targetQuaternion, smoothing);
}

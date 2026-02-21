export function angleABC(A: any, B: any, C: any) {
    const BA = { x: A.x - B.x, y: A.y - B.y };
    const BC = { x: C.x - B.x, y: C.y - B.y };
  
    const dot = BA.x * BC.x + BA.y * BC.y;
    const magBA = Math.sqrt(BA.x ** 2 + BA.y ** 2);
    const magBC = Math.sqrt(BC.x ** 2 + BC.y ** 2);
  
    if (magBA === 0 || magBC === 0) return null;
  
    let cos = dot / (magBA * magBC);
    cos = Math.max(-1, Math.min(1, cos));
    const rad = Math.acos(cos);
    return (rad * 180) / Math.PI;
  }

/**
 * Calculate distance between two landmarks
 */
export function distance2D(p1: any, p2: any): number | null {
  if (!p1 || !p2) return null;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate ankle elevation from rest position, normalized by body size
 * @param ankleLandmark - The ankle landmark (normalized coordinates 0-1)
 * @param restPosition - The baseline rest position Y coordinate (normalized 0-1)
 * @param bodySizeRef - Reference body size (e.g., hip-to-ankle distance) for normalization
 * @returns Elevation as a fraction of body size (positive = elevated, negative = below rest)
 */
export function calculateElevation(
  ankleLandmark: any, 
  restPosition: number | null,
  bodySizeRef: number | null = null
): number | null {
  if (!ankleLandmark || restPosition === null) return null;
  
  // In normalized coordinates, Y increases downward, so elevation = restPosition - currentY
  // This gives positive values when ankle is higher (lower Y value)
  const rawElevation = restPosition - ankleLandmark.y;
  
  // If body size reference is provided, normalize by it to make measurement distance-independent
  if (bodySizeRef !== null && bodySizeRef > 0) {
    return rawElevation / bodySizeRef;
  }
  
  // Otherwise return raw elevation (frame-relative)
  return rawElevation;
}
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
// What /bench shows (docs/PIANO-3D-ONLINE.md, section 4.6): frames a second, time per frame, the
// 1% slowest frames, and renderer.info counted over the whole frame (shadows and post-processing
// included, info.autoReset off in Stage.tsx). The budget: 150 draw calls, 300.000 triangles.
export interface FrameInfo {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  width: number;
  height: number;
  dpr: number;
}

export class FrameStats {
  private times = new Float64Array(600);
  private count = 0;
  private next = 0;
  info: FrameInfo = { calls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0, width: 0, height: 0, dpr: 1 };
  maxCalls = 0;
  maxTriangles = 0;

  frame(seconds: number, info: FrameInfo): void {
    this.times[this.next] = seconds * 1000;
    this.next = (this.next + 1) % this.times.length;
    this.count = Math.min(this.count + 1, this.times.length);
    this.info = info;
    this.maxCalls = Math.max(this.maxCalls, info.calls);
    this.maxTriangles = Math.max(this.maxTriangles, info.triangles);
  }

  // over the last 600 frames (10 s at 60 a second)
  summary(): { fps: number; meanMs: number; slowMs: number; frames: number } {
    if (!this.count) return { fps: 0, meanMs: 0, slowMs: 0, frames: 0 };
    const list = Array.from(this.times.subarray(0, this.count)).sort((a, b) => a - b);
    const mean = list.reduce((a, b) => a + b, 0) / list.length;
    // the 1% slowest frames: the time the slowest 1% are at or above
    const slow = list[Math.min(list.length - 1, Math.floor(list.length * 0.99))]!;
    return { fps: 1000 / mean, meanMs: mean, slowMs: slow, frames: this.count };
  }
}

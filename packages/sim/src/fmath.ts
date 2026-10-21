// The transcendental functions of the simulation, written with the operations IEEE 754 rounds the
// same way in every engine (+, -, *, /, sqrt), so a match gives the same numbers in Node, in
// Chromium and in any other browser. Math.sin and Math.cos are not: on 200.000 arguments Node 22
// (V8 12.4) and Chromium 141 differ in the last bit of 6.826 sines and 6.595 cosines
// (docs/DETTAGLI.md, "Gioco nuovo · fase 1"), and a match that differs in one bit plays on another way.
//
// sin, cos, exp, atan2: fdlibm (Sun Microsystems, 1993; the version in V8's src/base/ieee754.cc,
// from FreeBSD's msun), whose notice asks to keep it: "Copyright (C) 1993 by Sun Microsystems, Inc.
// All rights reserved. Developed at SunSoft, a Sun Microsystems, Inc. business. Permission to use,
// copy, modify, and distribute this software is freely granted, provided that this notice is
// preserved." hypot: the algorithm of V8's Math.hypot (src/builtins/math.tq) for two numbers.
// Each gives, bit for bit, what Math gives in Node 22 (bench/fmath_check.ts).

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1, HI = LITTLE ? 1 : 0, LO = LITTLE ? 0 : 1;
const high = (x: number): number => { f64[0] = x; return u32[HI]! | 0; };
const low = (x: number): number => { f64[0] = x; return u32[LO]! >>> 0; };
const words = (hi: number, lo: number): number => { u32[HI] = hi >>> 0; u32[LO] = lo >>> 0; return f64[0]!; };

// ---- sin, cos ----------------------------------------------------------------------------
const S1 = words(0xbfc55555, 0x55555549), S2 = words(0x3f811111, 0x1110f8a6), S3 = words(0xbf2a01a0, 0x19c161d5),
  S4 = words(0x3ec71de3, 0x57b1fe7d), S5 = words(0xbe5ae5e6, 0x8a2b9ceb), S6 = words(0x3de5d93a, 0x5acfd57c);
const C1 = words(0x3fa55555, 0x5555554c), C2 = words(0xbf56c16c, 0x16c15177), C3 = words(0x3efa01a0, 0x19cb1590),
  C4 = words(0xbe927e4f, 0x809c52ad), C5 = words(0x3e21ee9e, 0xbdb4b1c4), C6 = words(0xbda8fae9, 0xbe8838d4);

// sin and cos on [-pi/4, pi/4]; y is the tail of x after the reduction
function kernelSin(x: number, y: number, iy: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) return x;                 // |x| < 2^-27
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}
function kernelCos(x: number, y: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1;                 // |x| < 2^-27
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));   // |x| < 0.3
  const qx = ix > 0x3fe90000 ? 0.28125 : words(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx, a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const INVPIO2 = words(0x3fe45f30, 0x6dc9c883);
const PIO2_1 = words(0x3ff921fb, 0x54400000), PIO2_1T = words(0x3dd0b461, 0x1a626331);
const PIO2_2 = words(0x3dd0b461, 0x1a600000), PIO2_2T = words(0x3ba3198a, 0x2e037073);
const PIO2_3 = words(0x3ba3198a, 0x2e000000), PIO2_3T = words(0x397b839a, 0x252049c1);
const NPIO2_HW = [
  0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb,
  0x402c463a, 0x402f6a7a, 0x4031475c, 0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb,
  0x403ab41b, 0x403c463a, 0x403dd85a, 0x403f6a7a, 0x40407e4c, 0x4041475c, 0x4042106c, 0x4042d97c,
  0x4043a28c, 0x40446b9c, 0x404534ac, 0x4045fdbb, 0x4046c6cb, 0x40478fdb, 0x404858eb, 0x404921fb,
];
// x - n pi/2 as y0 + y1, for |x| up to 2^19 pi/2 (the simulation's angles stay under 10)
const rem = [0, 0];
function remPio2(x: number): number {
  const hx = high(x), ix = hx & 0x7fffffff;
  if (ix < 0x4002d97c) {                         // |x| < 3pi/4: n = +-1
    if (hx > 0) {
      let z = x - PIO2_1;
      if (ix !== 0x3ff921fb) { rem[0] = z - PIO2_1T; rem[1] = (z - rem[0]) - PIO2_1T; }
      else { z -= PIO2_2; rem[0] = z - PIO2_2T; rem[1] = (z - rem[0]) - PIO2_2T; }
      return 1;
    }
    let z = x + PIO2_1;
    if (ix !== 0x3ff921fb) { rem[0] = z + PIO2_1T; rem[1] = (z - rem[0]) + PIO2_1T; }
    else { z += PIO2_2; rem[0] = z + PIO2_2T; rem[1] = (z - rem[0]) + PIO2_2T; }
    return -1;
  }
  if (ix > 0x413921fb) throw new RangeError("fmath: angle beyond 2^19 pi/2");
  let t = Math.abs(x);
  const n = (t * INVPIO2 + 0.5) | 0, fn = n;
  let r = t - fn * PIO2_1, w = fn * PIO2_1T;
  if (n < 32 && ix !== NPIO2_HW[n - 1]) rem[0] = r - w;
  else {
    const j = ix >> 20;
    rem[0] = r - w;
    let i = j - ((high(rem[0]) >> 20) & 0x7ff);
    if (i > 16) {
      t = r; w = fn * PIO2_2; r = t - w; w = fn * PIO2_2T - ((t - r) - w); rem[0] = r - w;
      i = j - ((high(rem[0]) >> 20) & 0x7ff);
      if (i > 49) { t = r; w = fn * PIO2_3; r = t - w; w = fn * PIO2_3T - ((t - r) - w); rem[0] = r - w; }
    }
  }
  rem[1] = (r - rem[0]) - w;
  if (hx < 0) { rem[0] = -rem[0]; rem[1] = -rem[1]; return -n; }
  return n;
}

export function sin(x: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x), y0 = rem[0]!, y1 = rem[1]!;
  switch (n & 3) {
    case 0: return kernelSin(y0, y1, 1);
    case 1: return kernelCos(y0, y1);
    case 2: return -kernelSin(y0, y1, 1);
    default: return -kernelCos(y0, y1);
  }
}
export function cos(x: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x), y0 = rem[0]!, y1 = rem[1]!;
  switch (n & 3) {
    case 0: return kernelCos(y0, y1);
    case 1: return -kernelSin(y0, y1, 1);
    case 2: return -kernelCos(y0, y1);
    default: return kernelSin(y0, y1, 1);
  }
}

// ---- exp -----------------------------------------------------------------------------------
const O_THRESHOLD = words(0x40862e42, 0xfefa39ef), U_THRESHOLD = words(0xc0874910, 0xd52d3051);
const LN2HI = [words(0x3fe62e42, 0xfee00000), words(0xbfe62e42, 0xfee00000)];
const LN2LO = [words(0x3dea39ef, 0x35793c76), words(0xbdea39ef, 0x35793c76)];
const INVLN2 = words(0x3ff71547, 0x652b82fe);
const P1 = words(0x3fc55555, 0x5555553e), P2 = words(0xbf66c16c, 0x16bebd93), P3 = words(0x3f11566a, 0xaf25de2c),
  P4 = words(0xbebbbd41, 0xc5d26bf1), P5 = words(0x3e663769, 0x72bea4d0);
const E = words(0x4005bf0a, 0x8b145769), TWOM1000 = words(0x01700000, 0), TWO1023 = words(0x7fe00000, 0);
export function exp(x: number): number {
  let hx = high(x) >>> 0;
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) {                        // |x| >= 709.78...
    if (hx >= 0x7ff00000) return ((hx & 0xfffff) | low(x)) !== 0 ? x + x : xsb === 0 ? x : 0;
    if (x > O_THRESHOLD) return Infinity;
    if (x < U_THRESHOLD) return 0;
  }
  let hi = 0, lo = 0, k = 0;
  if (hx > 0x3fd62e42) {                         // |x| > 0.5 ln2
    if (hx < 0x3ff0a2b2) {                       // and |x| < 1.5 ln2
      if (x === 1) return E;
      hi = x - LN2HI[xsb]!; lo = LN2LO[xsb]!; k = 1 - xsb - xsb;
    } else {
      k = (INVLN2 * x + (xsb ? -0.5 : 0.5)) | 0;
      const t = k;
      hi = x - t * LN2HI[0]!; lo = t * LN2LO[0]!;
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) return 1 + x;     // |x| < 2^-28
  const t = x * x;
  const twopk = k >= -1021 ? words(0x3ff00000 + (k << 20), 0) : words(0x3ff00000 + ((k + 1000) << 20), 0);
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2.0) - x);
  const y = 1 - ((lo - (x * c) / (2.0 - c)) - hi);
  if (k >= -1021) return k === 1024 ? y * 2.0 * TWO1023 : y * twopk;
  return y * twopk * TWOM1000;
}

// ---- atan2 ---------------------------------------------------------------------------------
const ATANHI = [words(0x3fddac67, 0x0561bb4f), words(0x3fe921fb, 0x54442d18), words(0x3fef730b, 0xd281f69b), words(0x3ff921fb, 0x54442d18)];
const ATANLO = [words(0x3c7a2b7f, 0x222f65e2), words(0x3c81a626, 0x33145c07), words(0x3c700788, 0x7af0cbbd), words(0x3c91a626, 0x33145c07)];
const AT = [
  words(0x3fd55555, 0x5555550d), words(0xbfc99999, 0x9998ebc4), words(0x3fc24924, 0x920083ff), words(0xbfbc71c6, 0xfe231671),
  words(0x3fb745cd, 0xc54c206e), words(0xbfb3b0f2, 0xaf749a6d), words(0x3fb10d66, 0xa0d03d51), words(0xbfadde2d, 0x52defd9a),
  words(0x3fa97b4b, 0x24760deb), words(0xbfa2b444, 0x2c6a6c2f), words(0x3f90ad3a, 0xe322da11),
] as const;
function atan(x: number): number {
  const hx = high(x), ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {                        // |x| >= 2^66
    if (x !== x) return x + x;
    return hx > 0 ? ATANHI[3]! + ATANLO[3]! : -ATANHI[3]! - ATANLO[3]!;
  }
  let id;
  if (ix < 0x3fdc0000) {                         // |x| < 0.4375
    if (ix < 0x3e400000) return x;               // |x| < 2^-27
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {                       // |x| < 1.1875
      if (ix < 0x3fe60000) { id = 0; x = (2.0 * x - 1) / (2.0 + x); }
      else { id = 1; x = (x - 1) / (x + 1); }
    } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); }
    else { id = 3; x = -1.0 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id]! - ((x * (s1 + s2) - ATANLO[id]!) - x);
  return hx < 0 ? -r : r;
}
const PI = words(0x400921fb, 0x54442d18), PI_O_2 = words(0x3ff921fb, 0x54442d18), PI_O_4 = words(0x3fe921fb, 0x54442d18), PI_LO = words(0x3ca1a626, 0x33145c07);
export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return x + y;
  const hx = high(x), lx = low(x), hy = high(y), ly = low(y), ix = hx & 0x7fffffff, iy = hy & 0x7fffffff;
  if (x === 1) return atan(y);
  let m = ((hy >>> 31) & 1) | ((hx >>> 30) & 2);  // 2 sign(x) + sign(y)
  if ((iy | ly) === 0) return m < 2 ? y : m === 2 ? PI : -PI;
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 : PI_O_2;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) return [PI_O_4, -PI_O_4, 3.0 * PI_O_4, -3.0 * PI_O_4][m]!;
    return [0, -0, PI, -PI][m]!;
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 : PI_O_2;
  const k = (iy - ix) >> 20;
  let z;
  if (k > 60) { z = PI_O_2 + 0.5 * PI_LO; m &= 1; }
  else if (hx < 0 && k < -60) z = 0;
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return PI - (z - PI_LO);
    default: return (z - PI_LO) - PI;
  }
}

// ---- hypot ---------------------------------------------------------------------------------
// V8's Math.hypot for two numbers: both scaled by the larger, squared and summed (its Kahan
// correction is 0 after the first of two terms), square root, scaled back.
export function hypot(a: number, b: number): number {
  const x = Math.abs(a), y = Math.abs(b);
  if (x === Infinity || y === Infinity) return Infinity;
  if (x !== x || y !== y) return NaN;
  const max = x > y ? x : y;
  if (max === 0) return 0;
  const nx = x / max, ny = y / max;
  return Math.sqrt(nx * nx + ny * ny) * max;
}

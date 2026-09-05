/**
 * Skeleton poses. Coordinates are relative to the fighter's ground point,
 * facing right, y negative = up. Units are low-res pixels.
 */
export type Pt = [number, number];
export interface Pose {
  hip: Pt;
  neck: Pt;
  head: Pt;
  fElbow: Pt;
  fHand: Pt;
  bElbow: Pt;
  bHand: Pt;
  fKnee: Pt;
  fFoot: Pt;
  bKnee: Pt;
  bFoot: Pt;
}

export const JOINTS = [
  "hip",
  "neck",
  "head",
  "fElbow",
  "fHand",
  "bElbow",
  "bHand",
  "fKnee",
  "fFoot",
  "bKnee",
  "bFoot",
] as const;

const P = (o: Partial<Pose>, base: Pose = IDLE): Pose => ({ ...base, ...o });

export const IDLE: Pose = {
  hip: [0, -22],
  neck: [1, -37],
  head: [2, -43],
  fElbow: [7, -32],
  fHand: [10, -38],
  bElbow: [-3, -31],
  bHand: [3, -36],
  fKnee: [6, -12],
  fFoot: [8, 0],
  bKnee: [-6, -12],
  bFoot: [-9, 0],
};

export const WALK_A = P({
  fKnee: [9, -12],
  fFoot: [13, 0],
  bKnee: [-3, -12],
  bFoot: [-4, 0],
  hip: [0, -23],
});
export const WALK_B = P({
  fKnee: [3, -11],
  fFoot: [1, 0],
  bKnee: [-5, -13],
  bFoot: [-11, 0],
  hip: [0, -21],
});

export const CROUCH: Pose = {
  hip: [0, -13],
  neck: [2, -26],
  head: [3, -32],
  fElbow: [7, -22],
  fHand: [10, -27],
  bElbow: [-3, -21],
  bHand: [3, -26],
  fKnee: [9, -9],
  fFoot: [8, 0],
  bKnee: [-8, -9],
  bFoot: [-9, 0],
};

export const PUNCH_WIND = P({
  fElbow: [-2, -34],
  fHand: [2, -36],
  neck: [-1, -37],
  head: [0, -43],
});
export const PUNCH_HIT = P({
  hip: [2, -22],
  neck: [5, -37],
  head: [6, -43],
  fElbow: [12, -36],
  fHand: [22, -37],
  bElbow: [-1, -31],
  bHand: [3, -34],
  fKnee: [8, -12],
  fFoot: [11, 0],
  bKnee: [-5, -12],
  bFoot: [-9, 0],
});

export const KICK_WIND = P({
  hip: [0, -23],
  neck: [-2, -37],
  head: [-2, -43],
  fKnee: [8, -22],
  fFoot: [4, -14],
  fElbow: [4, -32],
  fHand: [8, -36],
});
export const KICK_HIT = P({
  hip: [1, -23],
  neck: [-4, -36],
  head: [-5, -42],
  fKnee: [12, -26],
  fFoot: [25, -32],
  bKnee: [-4, -12],
  bFoot: [-7, 0],
  fElbow: [2, -30],
  fHand: [-2, -26],
  bElbow: [-8, -30],
  bHand: [-10, -24],
});

export const UPPER_WIND = P(
  {
    fElbow: [-4, -20],
    fHand: [-2, -12],
    neck: [3, -26],
    head: [4, -32],
  },
  CROUCH
);
export const UPPER_HIT: Pose = {
  hip: [2, -25],
  neck: [3, -41],
  head: [3, -47],
  fElbow: [8, -42],
  fHand: [9, -58],
  bElbow: [-4, -32],
  bHand: [-2, -26],
  fKnee: [6, -14],
  fFoot: [8, 0],
  bKnee: [-5, -12],
  bFoot: [-9, 0],
};

export const SWEEP_WIND = P(
  {
    hip: [0, -11],
    neck: [-3, -25],
    head: [-3, -31],
  },
  CROUCH
);
export const SWEEP_HIT: Pose = {
  hip: [0, -10],
  neck: [-3, -24],
  head: [-3, -30],
  fElbow: [4, -20],
  fHand: [2, -14],
  bElbow: [-7, -14],
  bHand: [-9, -2],
  fKnee: [12, -6],
  fFoot: [24, -1],
  bKnee: [-6, -7],
  bFoot: [-8, 0],
};

export const JUMP: Pose = {
  hip: [0, -24],
  neck: [0, -39],
  head: [1, -45],
  fElbow: [7, -33],
  fHand: [8, -42],
  bElbow: [-5, -34],
  bHand: [-6, -44],
  fKnee: [6, -16],
  fFoot: [4, -8],
  bKnee: [-4, -15],
  bFoot: [-6, -6],
};

export const JUMP_KICK = P(
  {
    neck: [-2, -38],
    head: [-3, -44],
    fKnee: [10, -22],
    fFoot: [24, -16],
    bKnee: [-4, -14],
    bFoot: [-8, -8],
    fElbow: [2, -30],
    fHand: [-2, -24],
  },
  JUMP
);

export const JUMP_PUNCH = P(
  {
    fElbow: [10, -32],
    fHand: [20, -28],
    neck: [3, -38],
    head: [4, -44],
  },
  JUMP
);

export const BLOCK = P({
  fElbow: [6, -30],
  fHand: [4, -41],
  bElbow: [4, -28],
  bHand: [7, -37],
  neck: [0, -37],
  head: [0, -43],
});

export const CROUCH_BLOCK = P(
  {
    fElbow: [6, -20],
    fHand: [4, -30],
    bElbow: [4, -18],
    bHand: [7, -27],
  },
  CROUCH
);

export const HIT_HIGH = P({
  hip: [-1, -22],
  neck: [-4, -36],
  head: [-8, -41],
  fElbow: [4, -30],
  fHand: [8, -25],
  bElbow: [-6, -30],
  bHand: [-4, -24],
});

export const HIT_LOW = P(
  {
    neck: [-3, -25],
    head: [-6, -30],
    fElbow: [5, -20],
    fHand: [8, -14],
  },
  CROUCH
);

export const KNOCKBACK_AIR: Pose = {
  hip: [0, -20],
  neck: [-12, -25],
  head: [-17, -27],
  fElbow: [-8, -33],
  fHand: [-4, -39],
  bElbow: [-14, -31],
  bHand: [-12, -39],
  fKnee: [8, -14],
  fFoot: [14, -8],
  bKnee: [4, -12],
  bFoot: [10, -4],
};

export const LAUNCHED: Pose = {
  hip: [0, -24],
  neck: [10, -34],
  head: [14, -38],
  fElbow: [10, -22],
  fHand: [16, -16],
  bElbow: [16, -40],
  bHand: [22, -44],
  fKnee: [-8, -34],
  fFoot: [-14, -26],
  bKnee: [-6, -22],
  bFoot: [-14, -16],
};

export const LYING: Pose = {
  hip: [0, -4],
  neck: [-14, -5],
  head: [-20, -5],
  fElbow: [-9, -10],
  fHand: [-16, -9],
  bElbow: [-10, -2],
  bHand: [-17, -2],
  fKnee: [8, -7],
  fFoot: [16, -4],
  bKnee: [8, -3],
  bFoot: [16, -1],
};

export const WIN: Pose = {
  hip: [0, -22],
  neck: [0, -38],
  head: [0, -44],
  fElbow: [7, -46],
  fHand: [9, -58],
  bElbow: [-7, -46],
  bHand: [-9, -58],
  fKnee: [6, -12],
  fFoot: [8, 0],
  bKnee: [-6, -12],
  bFoot: [-9, 0],
};

export const SPECIAL_WIND = P({
  neck: [-2, -37],
  head: [-2, -43],
  fElbow: [-4, -28],
  fHand: [-8, -22],
  bElbow: [-8, -30],
  bHand: [-10, -24],
  fKnee: [8, -12],
  fFoot: [12, 0],
  bKnee: [-8, -12],
  bFoot: [-12, 0],
});
export const SPECIAL_HIT = P({
  hip: [2, -22],
  neck: [5, -37],
  head: [6, -43],
  fElbow: [12, -35],
  fHand: [20, -35],
  bElbow: [10, -33],
  bHand: [19, -32],
  fKnee: [9, -12],
  fFoot: [13, 0],
  bKnee: [-8, -12],
  bFoot: [-12, 0],
});

export const DIZZY = P({
  neck: [-2, -36],
  head: [-4, -42],
  fElbow: [5, -28],
  fHand: [9, -22],
  bElbow: [-6, -28],
  bHand: [-8, -22],
  fKnee: [8, -12],
  fFoot: [11, 0],
  bKnee: [-8, -12],
  bFoot: [-12, 0],
});

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const j of JOINTS) {
    out[j] = [a[j][0] + (b[j][0] - a[j][0]) * t, a[j][1] + (b[j][1] - a[j][1]) * t];
  }
  return out;
}

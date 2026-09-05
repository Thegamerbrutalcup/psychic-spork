export interface Palette {
  primary: string;
  secondary: string;
  skin: string;
  dark: string;
  accent: string;
  eyes: string;
}

export interface FighterDef {
  name: string;
  palette: Palette;
  projectile: string[];
  taunt: string;
}

export interface StageDef {
  name: string;
  sky: [string, string];
  moon: string;
  far: string;
  mid: string;
  floor: string;
  floorLine: string;
  accent: string;
}

export const ROSTER: FighterDef[] = [
  {
    name: "SCORCH",
    palette: { primary: "#f2c12e", secondary: "#1b1b1f", skin: "#e8b48a", dark: "#8a6d12", accent: "#ffffff", eyes: "#ffffff" },
    projectile: ["#ffe58a", "#ff9c2e", "#ff5a1f"],
    taunt: "GET OVER HERE",
  },
  {
    name: "FROST",
    palette: { primary: "#2f7de1", secondary: "#1b1b1f", skin: "#e8b48a", dark: "#163d73", accent: "#bfe6ff", eyes: "#ffffff" },
    projectile: ["#dff6ff", "#7fd0ff", "#2f7de1"],
    taunt: "FREEZE",
  },
  {
    name: "VENOM",
    palette: { primary: "#3cc24a", secondary: "#1b1b1f", skin: "#e8b48a", dark: "#1c6b26", accent: "#b6ff9d", eyes: "#e6ff5a" },
    projectile: ["#d8ff6a", "#7ff03a", "#2b9a2a"],
    taunt: "HISSS",
  },
  {
    name: "EMBER",
    palette: { primary: "#e03a3a", secondary: "#1b1b1f", skin: "#e8b48a", dark: "#7a1616", accent: "#ffb2b2", eyes: "#7dff7d" },
    projectile: ["#ffd0d0", "#ff5a5a", "#a51919"],
    taunt: "WE ARE MANY",
  },
  {
    name: "SMOG",
    palette: { primary: "#9aa1ad", secondary: "#2b2e36", skin: "#d9d9d9", dark: "#4c515b", accent: "#ffffff", eyes: "#ffffff" },
    projectile: ["#ffffff", "#c3c8d1", "#7e848f"],
    taunt: "VANISH",
  },
  {
    name: "MONSOON",
    palette: { primary: "#8a3ee0", secondary: "#1b1b1f", skin: "#e8b48a", dark: "#4a1a80", accent: "#dcb8ff", eyes: "#ffffff" },
    projectile: ["#efe0ff", "#b98cff", "#6a2ac2"],
    taunt: "KNEEL",
  },
  {
    name: "VOID",
    palette: { primary: "#242428", secondary: "#0d0d10", skin: "#3a3a40", dark: "#101012", accent: "#6f6f7a", eyes: "#ffffff" },
    projectile: ["#8a8a99", "#3b3b44", "#000000"],
    taunt: "...",
  },
];

export const STAGES: StageDef[] = [
  {
    name: "THE PIT",
    sky: ["#1a0a2e", "#4a1a4e"],
    moon: "#f7e7b0",
    far: "#241238",
    mid: "#160a22",
    floor: "#3a2a3a",
    floorLine: "#5a3f5a",
    accent: "#ff7a3a",
  },
  {
    name: "FROZEN SHRINE",
    sky: ["#061224", "#12365a"],
    moon: "#d9f4ff",
    far: "#0e2440",
    mid: "#081628",
    floor: "#2c4658",
    floorLine: "#4c7088",
    accent: "#8fd9ff",
  },
  {
    name: "ACID GARDEN",
    sky: ["#0a1a08", "#1f4a18"],
    moon: "#d0ff9a",
    far: "#142c10",
    mid: "#0b1a09",
    floor: "#2a3d22",
    floorLine: "#4c6a3a",
    accent: "#a6ff4a",
  },
  {
    name: "BLOOD TEMPLE",
    sky: ["#200606", "#5a1212"],
    moon: "#ffd6a0",
    far: "#3a0c0c",
    mid: "#220707",
    floor: "#402020",
    floorLine: "#6a3434",
    accent: "#ff4a4a",
  },
  {
    name: "ASH ROOFTOP",
    sky: ["#101014", "#34343e"],
    moon: "#ffffff",
    far: "#1c1c22",
    mid: "#121216",
    floor: "#2e2e34",
    floorLine: "#4c4c56",
    accent: "#c0c0cc",
  },
];

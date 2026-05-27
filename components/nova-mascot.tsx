"use client";

import * as React from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

export type Mood = "happy" | "smile" | "wink" | "sleepy" | "shy" | "curious" | "excited" | "meh";

interface Props {
  className?: string;
  size?: number;
  mood?: Mood;
}

/**
 * A cute soft-gradient blob with eyes + mouth that randomly idles between micro-animations.
 * The face also randomly blinks and shifts mood (left eye / right eye / mouth shapes).
 */
export function NovaMascot({ className, size = 160, mood }: Props) {
  const [auto, setAuto] = React.useState<Mood>(mood ?? "smile");
  const bodyCtrl = useAnimation();

  // Random micro-actions — squish, hop, sway, idle.
  React.useEffect(() => {
    let alive = true;
    const loop = async () => {
      // Wait a frame so the motion component has subscribed to these controls
      // before the first start() — otherwise framer-motion warns that
      // controls.start() was called before the component mounted.
      await new Promise<void>((res) => requestAnimationFrame(() => res()));
      if (!alive) return;
      while (alive) {
        const r = Math.random();
        if (r < 0.25) {
          await bodyCtrl.start({
            scaleX: [1, 1.06, 0.95, 1],
            scaleY: [1, 0.94, 1.05, 1],
            transition: { duration: 1.2, ease: "easeInOut" }
          });
        } else if (r < 0.5) {
          await bodyCtrl.start({
            y: [0, -8, 0, -3, 0],
            transition: { duration: 1.6, ease: "easeInOut" }
          });
        } else if (r < 0.75) {
          await bodyCtrl.start({
            rotate: [0, 6, -6, 3, 0],
            transition: { duration: 1.6, ease: "easeInOut" }
          });
        } else {
          await bodyCtrl.start({
            scale: [1, 1.04, 1],
            transition: { duration: 1.6, ease: "easeInOut" }
          });
        }
        await new Promise((r) => setTimeout(r, 700 + Math.random() * 1400));
      }
    };
    loop();
    return () => {
      alive = false;
    };
  }, [bodyCtrl]);

  // Random mood shifts every few seconds
  React.useEffect(() => {
    if (mood) {
      setAuto(mood);
      return;
    }
    const moods: Mood[] = ["happy", "smile", "wink", "shy", "curious", "excited", "meh"];
    const id = setInterval(() => {
      setAuto(moods[Math.floor(Math.random() * moods.length)]);
    }, 3200 + Math.random() * 1800);
    return () => clearInterval(id);
  }, [mood]);

  return (
    <motion.div
      animate={bodyCtrl}
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      {/* outer soft glow */}
      <motion.div
        className="absolute inset-[-15%] rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, #F0ABFC, #A5B4FC 45%, transparent 70%)"
        }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity }}
      />

      {/* body — soft pastel ball */}
      <div className="absolute inset-0 rounded-full overflow-hidden shadow-[0_24px_60px_-16px_rgba(99,102,241,0.4)]">
        {/* primary gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 70% at 30% 30%, #FFE4F0 0%, #FBCFE8 35%, #C7D2FE 70%, #A5B4FC 100%)"
          }}
        />
        {/* soft highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 30% at 28% 22%, rgba(255,255,255,0.85), transparent 60%)"
          }}
        />
        {/* bottom shadow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 40% at 70% 90%, rgba(167,139,250,0.4), transparent 60%)"
          }}
        />

        {/* face */}
        <Face mood={auto} />
      </div>
    </motion.div>
  );
}

function Face({ mood }: { mood: Mood }) {
  const [blink, setBlink] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    const loop = async () => {
      while (alive) {
        await new Promise((r) => setTimeout(r, 1800 + Math.random() * 2800));
        setBlink(true);
        await new Promise((r) => setTimeout(r, 120));
        setBlink(false);
      }
    };
    loop();
    return () => {
      alive = false;
    };
  }, []);

  // Eye descriptors: w, h, cy offset from baseline. Different moods reshape them.
  const leftEye = eyeFor(mood, "left");
  const rightEye = eyeFor(mood, "right");
  const mouth = mouthFor(mood);

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full"
      style={{ overflow: "visible" }}
    >
      {/* cheeks */}
      <motion.ellipse
        cx="30"
        cy="60"
        rx="6"
        ry="3.5"
        fill="#FB7185"
        opacity={mood === "shy" ? 0.7 : 0.45}
        animate={{ opacity: mood === "shy" ? [0.5, 0.85, 0.5] : 0.45 }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.ellipse
        cx="70"
        cy="60"
        rx="6"
        ry="3.5"
        fill="#FB7185"
        opacity={mood === "shy" ? 0.7 : 0.45}
        animate={{ opacity: mood === "shy" ? [0.5, 0.85, 0.5] : 0.45 }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* eyes */}
      <motion.ellipse
        cx={leftEye.cx}
        cy={leftEye.cy}
        rx={leftEye.rx}
        ry={blink ? 0.6 : leftEye.ry}
        fill="#1f2937"
        animate={{ y: [0, -0.5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <motion.ellipse
        cx={rightEye.cx}
        cy={rightEye.cy}
        rx={rightEye.rx}
        ry={blink ? 0.6 : rightEye.ry}
        fill="#1f2937"
        animate={{ y: [0, -0.5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      {/* mouth */}
      <motion.path
        d={mouth}
        stroke="#1f2937"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill={mood === "happy" || mood === "excited" ? "#1f2937" : "none"}
        initial={false}
        animate={{ d: mouth }}
        transition={{ duration: 0.35 }}
      />
    </svg>
  );
}

function eyeFor(mood: Mood, side: "left" | "right") {
  const cx = side === "left" ? 40 : 60;
  const baseY = 52;
  switch (mood) {
    case "wink":
      if (side === "left") return { cx, cy: baseY + 0.5, rx: 1.8, ry: 0.6 };
      return { cx, cy: baseY, rx: 2.2, ry: 2.6 };
    case "sleepy":
      return { cx, cy: baseY + 0.5, rx: 2.4, ry: 1 };
    case "happy":
      return { cx, cy: baseY, rx: 2.2, ry: 2.4 };
    case "shy":
      return { cx, cy: baseY + 0.5, rx: 1.8, ry: 0.8 };
    case "curious":
      return { cx, cy: baseY - 1, rx: 2.4, ry: 3 };
    case "excited":
      return { cx, cy: baseY, rx: 2.6, ry: 3.2 };
    case "meh":
      return { cx, cy: baseY + 0.5, rx: 2.4, ry: 0.5 };
    case "smile":
    default:
      return { cx, cy: baseY, rx: 2.2, ry: 2.4 };
  }
}

function mouthFor(mood: Mood) {
  switch (mood) {
    case "happy":
      return "M42 65 Q50 73 58 65";
    case "smile":
      return "M44 65 Q50 70 56 65";
    case "wink":
      return "M44 65 Q50 70 56 65";
    case "shy":
      return "M46 67 Q50 69 54 67";
    case "sleepy":
      return "M46 67 L54 67";
    case "curious":
      return "M48 67 Q50 70 52 67";
    case "excited":
      return "M42 64 Q50 76 58 64";
    case "meh":
    default:
      return "M44 67 L56 67"; // straight line (not bad, not good)
  }
}

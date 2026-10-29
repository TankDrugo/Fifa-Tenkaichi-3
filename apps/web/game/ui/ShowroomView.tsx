"use client";
// The page around the showroom (showroom.ts): the team's name and the style on top. The scene is
// drawn only in the browser (WebGL), so it is loaded without server rendering.
import dynamic from "next/dynamic";
import type { ShowroomOptions } from "../render/showroom";

const ShowroomStage = dynamic(() => import("./ShowroomStage").then((m) => m.ShowroomStage), { ssr: false });

export function ShowroomView({ options, title }: { options: ShowroomOptions; title: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <ShowroomStage options={options} />
      <div style={{ position: "absolute", top: 14, left: 16, padding: "8px 16px", background: "rgba(10,14,28,0.82)", color: "#fff", borderRadius: 10, font: "700 20px/1.3 system-ui, sans-serif" }}>
        {title}
      </div>
    </div>
  );
}

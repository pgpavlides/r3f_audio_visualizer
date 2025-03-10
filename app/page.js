'use client';

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Use dynamic import with SSR disabled for the visualizer
const AudioVisualizer = dynamic(
  () => import("./components/AudioVisualizer"),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      <Suspense fallback={
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-white">Loading visualizer...</div>
        </div>
      }>
        <AudioVisualizer />
      </Suspense>
    </div>
  );
}
import * as React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 aurora-bg" />
        <div className="absolute inset-0 grid-fade opacity-50" />
      </div>
      {children}
    </div>
  );
}

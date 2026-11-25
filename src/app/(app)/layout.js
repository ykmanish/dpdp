import { Suspense } from "react";
import AppProviders from "@/components/providers";

// The shell reads the pathname/params, which are request-time on dynamic
// routes such as /sites/[id] — so it lives inside a Suspense boundary.
export default function AppLayout({ children }) {
  return (
    <Suspense fallback={<div className="scenery min-h-screen" />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}

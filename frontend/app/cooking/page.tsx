import { Suspense } from "react";

import { CookingScreen } from "@/components/cooking-screen";

export default function CookingPage() {
  return (
    <Suspense fallback={null}>
      <CookingScreen />
    </Suspense>
  );
}

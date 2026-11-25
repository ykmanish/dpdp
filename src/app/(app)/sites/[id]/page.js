import { Suspense } from "react";
import View from "./view";

// Client-rendered view backed by the Express API.
export const instant = false;

export default function Page() {
  // useParams() in the view needs a Suspense boundary for the dynamic segment.
  return (
    <Suspense fallback={null}>
      <View />
    </Suspense>
  );
}

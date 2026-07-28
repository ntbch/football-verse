import { Suspense } from "react";
import PredictionsPage from "@/features/predictions/page";

export default function Page() {
  return (
    <Suspense>
      <PredictionsPage />
    </Suspense>
  );
}

import { Suspense } from "react";
import PredictionDetailPage from "@/features/predictions/detail-page";

export default function Page() {
  return <Suspense><PredictionDetailPage /></Suspense>;
}

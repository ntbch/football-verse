import { Suspense } from "react";
import PredictionsPage from "@/features/predictions/page";

export const metadata = {
  title: "Matchday | Football Verse",
  description: "Fixtures, predictions, standings and match context.",
};

export default function MatchdayRoute() {
  return <Suspense><PredictionsPage /></Suspense>;
}

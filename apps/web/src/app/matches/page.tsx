import { redirect } from "next/navigation";

/** Legacy bookmark kept as a temporary redirect; Matchday owns fixtures now. */
export default function LegacyMatchesRoute() {
  redirect("/matchday");
}

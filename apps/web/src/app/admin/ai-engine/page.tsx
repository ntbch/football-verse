import AdminAiEnginePage from "@/features/admin/ai-engine/page";

export const metadata = {
  title: "AI & Vector Clustering Engine | Admin Control Hub",
  description: "Monitor Gemini API model performance, pgvector similarity scores, and automated story decisions",
};

export default function Page() {
  return <AdminAiEnginePage />;
}

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="display-face text-4xl font-black">Settings</h1>
      <div className="mt-5 border border-white/15 p-4">
        <p className="font-bold">Phase 1 flags</p>
        <p className="mt-2 text-sm opacity-70">RSS parser, uploads, and full-text search are intentionally deferred until their backend pieces are real.</p>
      </div>
    </div>
  );
}

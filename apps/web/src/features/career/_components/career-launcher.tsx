import type { FormEvent } from "react";
import Link from "next/link";
import type { CareerSave } from "../_types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";

export function CareerLauncher({ saves, name, loading, error, creating, onNameChange, onCreate, onOpen }: {
  saves?: CareerSave[];
  name: string;
  loading: boolean;
  error: boolean;
  creating: boolean;
  onNameChange: (name: string) => void;
  onCreate: (event: FormEvent) => void;
  onOpen: (saveId: string) => void;
}) {
  return <main className="career-launcher">
    <Link href="/" className="career-launcher-back">← Back to portal</Link>
    <section className="career-launcher-panel" aria-labelledby="career-launcher-title">
      <header><span className="career-launcher-mark" aria-hidden="true">FVF</span><p className="eyebrow">Football Verse Career</p><h1 id="career-launcher-title">Choose your career</h1><p>Continue a saved journey or start a new one.</p></header>
      {loading && <LoadingBlock label="Loading Careers" />}
      {error && <ErrorBlock message="Could not load Careers." />}
      {!loading && !error && <>
        <div className="career-launcher-saves" aria-label="Saved careers">
          {saves?.map((save) => <button key={save.id} type="button" onClick={() => onOpen(save.id)}><span className="career-launcher-save-mark" aria-hidden="true">S{save.seasonNumber}</span><span><strong>{save.name}</strong><small>{save.gameDate} · {save.status.replaceAll("_", " ")}</small></span><b>Continue →</b></button>)}
          {!saves?.length && <p className="career-launcher-empty">No saved career yet.</p>}
        </div>
        <form onSubmit={onCreate} className="career-launcher-create"><div><p className="eyebrow">New journey</p><h2>Create a career</h2></div><label><span>Career name</span><input className="input" value={name} maxLength={100} onChange={(event) => onNameChange(event.target.value)} /></label><button className="btn btn-primary" disabled={creating}>{creating ? "Creating…" : "New career"}</button></form>
      </>}
    </section>
  </main>;
}

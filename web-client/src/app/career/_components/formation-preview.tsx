import type { Formation } from "../_types";
import type { FormationRemapResult } from "../_formation-remap";

export function FormationPreview({ current, result, onCancel, onApply }: {
  current: Formation; result: FormationRemapResult; onCancel: () => void; onApply: () => void;
}) {
  return <div className="formation-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onCancel(); }}>
    <section className="formation-preview" role="dialog" aria-modal="true" aria-labelledby="formation-preview-title">
      <p className="eyebrow">Formation change</p><h2 id="formation-preview-title">Review {current} → {result.formation}</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">{result.preview.summary}</p>
      <div className="formation-preview-list"><h3>Player moves</h3>{result.preview.moves.length ? result.preview.moves.map((move, index) => <p key={`${index}-${move}`}>{move}</p>) : <p>No player movement required.</p>}
        {result.preview.roleResets.length > 0 && <><h3>Role and duty changes</h3>{result.preview.roleResets.map((reset, index) => <p key={`${index}-${reset}`}>{reset}</p>)}</>}
      </div>
      <div className="formation-preview-actions"><button type="button" className="btn btn-secondary" onClick={onCancel}>Keep {current}</button><button type="button" className="btn btn-primary" autoFocus onClick={onApply}>Apply {result.formation}</button></div>
    </section>
  </div>;
}

"use client";

export function Pagination({ page, totalPages, totalItems, onChange }: {
  page: number; totalPages: number; totalItems: number; onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return totalItems ? <p className="career-page-summary">{totalItems} results</p> : null;
  return <nav className="career-pagination" aria-label="Results pages">
    <span>{totalItems} results</span>
    <button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button>
    <strong>Page {page + 1} of {totalPages}</strong>
    <button type="button" className="btn btn-secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
  </nav>;
}

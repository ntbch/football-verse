import type { ManagerDashboard, ManagerJob } from "../_types";
import type { SubTab } from "../_navigation";

export function ManagerTab({ subTab, manager, decisions, jobs, onAcceptJob }: {
  subTab: SubTab | "";
  manager: ManagerDashboard;
  decisions?: Record<string, unknown>[];
  jobs?: ManagerJob[];
  onAcceptJob: (clubId: string) => void;
}) {
  return <section className="career-manager-grid">
    {subTab === "profile" && <div className="card career-panel"><p className="eyebrow">Manager profile</p><h2 className="text-2xl font-black">{manager.name}</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">{manager.age} · {manager.clubName ?? "Unemployed"} · Reputation {manager.reputation}</p>
      <div className="career-metric-grid">{Object.entries({ Tactical: manager.tactical, Adaptability: manager.adaptability, Rotation: manager.rotation, Youth: manager.youth, Discipline: manager.discipline, Transfer: manager.transfer, Risk: manager.risk }).map(([key,value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>
    </div>}
    {subTab === "board" && <div className="card career-panel"><p className="eyebrow">Board confidence</p><h2 className="text-xl font-black">{manager.pressure} · {manager.boardPressure}%</h2>
      <p className="text-sm mt-2">Record {manager.wins}W {manager.draws}D {manager.losses}L</p>
      <div className="career-objectives">{manager.objectives.map((item) => <p key={item.type}><span>{item.type}</span><strong>{item.progress}/{item.target}</strong></p>)}</div>
    </div>}
    {subTab === "decisions" && <div className="card career-panel"><h2 className="font-black mb-3">Recent decisions</h2>{decisions?.slice(0, 8).map((item, index) => <p key={index} className="career-list-row">{String(item.domain)} · {String(item.decision_code)}</p>)}</div>}
    {subTab === "jobs" && <div className="card career-panel"><h2 className="font-black mb-3">Job market</h2>{jobs?.map((job) => <div key={job.club_id} className="career-list-row flex justify-between items-center"><span>{job.club_name} · {job.status}</span>{manager.status === "UNEMPLOYED" && job.status === "VACANT" && <button className="btn btn-primary !py-2 !px-3" onClick={() => onAcceptJob(job.club_id)}>Accept</button>}</div>)}</div>}
  </section>;
}

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateMemberAnalytics } from "../../lib/memberAnalytics.js";

const safePercent = value => Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
const show = (value, suffix = "") => value === null || value === undefined ? "Not enough data" : `${value}${suffix}`;

export default function MemberEvidence({
  member,
  tasks = [],
  task,
  period,
  selected = false,
  onSelect,
}) {
  const anchorRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const [fallbackPeriod] = useState(() => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  });

  const analytics = useMemo(() => {
    const requirements = task?.type
      ? [{ name: task.type, requiredLevel: task.complexity === "Critical" ? 90 : task.complexity === "High" ? 80 : 70, mandatory: true }]
      : [];
    const normalisedTasks = tasks.map(item => ({
      ...item,
      storyPoints: Number(item.storyPoints ?? item.effort ?? 0),
      remainingEffortHours: Number(item.remainingEffortHours ?? item.effort ?? 0) * 4,
    }));
    return calculateMemberAnalytics({
      member,
      tasks: normalisedTasks,
      events: member.events || [],
      requirements,
      period: period || fallbackPeriod,
      newTaskEffortHours: Number(task?.effort || 0) * 4,
      projectId: task?.projectId || null,
    });
  }, [member, tasks, task, period, fallbackPeriod]);

  const memberTasks = tasks.filter(item => item.assigneeId === member.id);
  const done = memberTasks.filter(item => item.status === "Done");
  const blocked = memberTasks.filter(item => item.status === "Blocked");
  const fit = safePercent(analytics.assignmentFit) ?? 0;
  const capacity = safePercent(analytics.capacity.projectedUtilisation) ?? member.workload ?? 0;
  const completion = memberTasks.length ? Math.round((done.length / memberTasks.length) * 100) : null;
  const skill = Number(member.skills?.[task?.type] ?? analytics.skillMatch.matched?.[0]?.memberLevel ?? 50);

  const skillData = Object.entries(member.skills || {})
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
  const deliveryData = [
    { name: "Done", value: done.length, fill: "#16a36a" },
    { name: "Active", value: memberTasks.filter(item => ["In Progress", "Review"].includes(item.status)).length, fill: "#0875f5" },
    { name: "Blocked", value: blocked.length, fill: "#e5484d" },
  ];
  const trendData = analytics.weeklyTrend.length
    ? analytics.weeklyTrend
    : [
        { week: "Current", utilisation: capacity, completedPoints: done.reduce((sum, item) => sum + Number(item.effort || 0), 0) },
        { week: "Projected", utilisation: capacity, completedPoints: done.reduce((sum, item) => sum + Number(item.effort || 0), 0) + Number(task?.effort || 0) },
      ];

  const showHover = () => {
    const box = anchorRef.current?.getBoundingClientRect();
    if (box) setAnchor({ top: Math.min(window.innerHeight - 260, box.bottom + 8), left: Math.max(12, Math.min(window.innerWidth - 350, box.left)) });
    setHovered(true);
  };

  const card = (
    <div
      ref={anchorRef}
      className={`member-evidence-card ${selected ? "selected" : ""}`}
      role="button"
      tabIndex={0}
      onMouseEnter={showHover}
      onMouseLeave={() => setHovered(false)}
      onFocus={showHover}
      onBlur={() => setHovered(false)}
      onClick={() => onSelect?.(member.id)}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") onSelect?.(member.id); }}
    >
      <span className="member-evidence-avatar" style={{ background: member.color }}>{member.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
      <span className="member-evidence-copy"><strong>{member.name}</strong><small>{member.role}</small></span>
      <span className={`member-fit ${fit >= 75 ? "good" : fit >= 55 ? "medium" : "risk"}`}><b>{fit}%</b><small>fit</small></span>
      <span className="member-load"><i><em style={{ width: `${Math.min(100, capacity)}%` }} /></i><small>{capacity}% projected</small></span>
      <button type="button" onClick={event => { event.stopPropagation(); setHovered(false); setOpen(true); }}>Evidence</button>
    </div>
  );

  return <>
    {card}
    {hovered && createPortal(
      <div className="member-evidence-popover" style={{ top: anchor.top, left: anchor.left }}>
        <header><span style={{ background: member.color }}>{member.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span><div><strong>{member.name}</strong><small>{member.role}</small></div><b>{fit}% fit</b></header>
        <div className="member-evidence-mini-grid">
          <span><b>{capacity}%</b><small>Projected load</small></span>
          <span><b>{show(completion, "%")}</b><small>Task progress</small></span>
          <span><b>{blocked.length}</b><small>Blocked</small></span>
          <span><b>{skill}</b><small>{task?.type || "Top skill"}</small></span>
        </div>
        <p>{analytics.confidence.recommendationStatus} · evidence confidence {analytics.confidence.score}%</p>
      </div>, document.body
    )}
    {open && createPortal(
      <div className="evidence-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="evidence-modal" role="dialog" aria-modal="true" aria-label={`${member.name} evidence`}>
          <header className="evidence-modal-head">
            <span className="member-evidence-avatar large" style={{ background: member.color }}>{member.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
            <div><small>MEMBER EVIDENCE</small><h2>{member.name}</h2><p>{member.role} · {analytics.confidence.recommendationStatus}</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close evidence">×</button>
          </header>
          <div className="evidence-kpis">
            <article><strong>{fit}%</strong><span>Assignment fit</span><small>Skills, capacity and evidence</small></article>
            <article><strong>{capacity}%</strong><span>Projected utilisation</span><small>{analytics.capacity.projectedHeadroomHours}h headroom</small></article>
            <article><strong>{done.length}</strong><span>Tasks completed</span><small>{done.reduce((sum, item) => sum + Number(item.effort || 0), 0)} delivered points</small></article>
            <article><strong>{analytics.confidence.score}%</strong><span>Evidence confidence</span><small>Formula {analytics.formulaVersion}</small></article>
          </div>
          <div className="evidence-chart-grid">
            <article><h3>Capability profile</h3><p>Validated and recorded skill levels</p><div className="evidence-chart"><ResponsiveContainer width="100%" height="100%"><RadarChart data={skillData}><PolarGrid /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#667085" }} /><Radar dataKey="value" stroke="#0875f5" fill="#0875f5" fillOpacity={0.2} /><Tooltip /></RadarChart></ResponsiveContainer></div></article>
            <article><h3>Delivery evidence</h3><p>Current task outcomes</p><div className="evidence-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={deliveryData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={25} /><Tooltip /><Bar dataKey="value" radius={[7, 7, 0, 0]} fill="#0875f5" /></BarChart></ResponsiveContainer></div></article>
            <article className="wide"><h3>Capacity and throughput</h3><p>Interactive work trend; missing history is never scored as poor performance</p><div className="evidence-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" tick={{ fontSize: 10 }} /><YAxis width={32} /><Tooltip /><Legend /><Line type="monotone" dataKey="utilisation" name="Utilisation %" stroke="#0875f5" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="completedPoints" name="Completed points" stroke="#16a36a" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></article>
          </div>
          <footer><span>Cycle time: {show(analytics.delivery.medianCycleDays, " days")}</span><span>Throughput: {show(analytics.delivery.pointThroughputPerWeek, " pts/week")}</span><span>Delay rate: {show(analytics.delivery.delayRate, "%")}</span><span>Feedback: {show(analytics.feedback.feedbackPerWeek, "/week")}</span></footer>
        </section>
      </div>, document.body
    )}
  </>;
}

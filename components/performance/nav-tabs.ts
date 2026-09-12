/** Sub-tabs shared across the Performance section so linked surfaces
 *  (Overview, Exit Interviews, Full and Final) render the same top bar
 *  and stay reachable without a sidebar entry of their own. */
export const PERFORMANCE_TABS = [
  { id: "appraisals", label: "Appraisals" },
  { id: "goals", label: "Goals" },
  { id: "feedback", label: "Feedback" },
  { id: "pip", label: "PIP" },
  { id: "overview", label: "Overview" },
  { id: "exit-interviews", label: "Exit interviews" },
  { id: "full-and-final", label: "Full & final" },
];

export function performanceHrefFor(id: string): string {
  if (id === "appraisals") return "/hr/performance";
  if (id === "overview") return "/hr/performance/overview";
  if (id === "exit-interviews") return "/hr/exit-interviews";
  if (id === "full-and-final") return "/hr/full-and-final";
  return `/hr/performance?tab=${id}`;
}

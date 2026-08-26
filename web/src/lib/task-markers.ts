const MARKED_TASK_PATTERN = /^(?:task|todo|to do|action item|action|next step)\s*[:\-]\s*(.+)$/i;

export function markedTaskTitle(line: string) {
  const match = String(line || "").trim().match(MARKED_TASK_PATTERN);
  return match ? match[1].trim() : null;
}

export function extractMarkedTaskTitles(notes: string) {
  return String(notes || "")
    .split(/\r?\n/)
    .map(markedTaskTitle)
    .filter((title): title is string => Boolean(title));
}

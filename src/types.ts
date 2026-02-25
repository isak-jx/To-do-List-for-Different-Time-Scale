export type TaskScale = "daily" | "weekly" | "longterm" | "event";

export interface TimeRange {
  start: string | null;
  end: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  scale: TaskScale;
  date: string | null; // Format: YYYY-MM-DD
  timeRange: TimeRange;
  location: string | null;
  completed: boolean;

  // Sync fields
  linkedWeeklyId: string | null;
  linkedDailyIds: string[];

  parentLongtermId: string | null;

  createdAt: number;
  updatedAt: number;
}

export interface LongTermList {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  tasks: string[]; // Array of task IDs
}

export interface DailyNote {
  date: string; // YYYY-MM-DD
  rating: number | null; // 0.5 to 5.0, step 0.5
  summary: string; // max 100 chars
}

export interface WeeklyNote {
  weekStart: string; // YYYY-MM-DD (Monday)
  summary: string; // max 500 chars
}


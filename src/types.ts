export type TaskScale = "daily" | "weekly" | "longterm";

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

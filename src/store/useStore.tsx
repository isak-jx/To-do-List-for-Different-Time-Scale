import React, { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { format, startOfWeek } from "date-fns";
import { Task, LongTermList, TaskScale, DailyNote, WeeklyNote } from "../types";

interface AppState {
  tasks: Task[];
  longTermLists: LongTermList[];
  dailyNotes: Record<string, DailyNote>;
  weeklyNotes: Record<string, WeeklyNote>;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  
  // Task operations
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "linkedWeeklyId" | "linkedDailyIds">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Drag and Drop operations
  copyWeeklyToDaily: (weeklyId: string, date: string) => void;
  copyWeeklyToWeekly: (weeklyId: string, targetWeekStart: string) => void;
  
  // Long-term operations
  addLongTermList: (list: Omit<LongTermList, "id" | "tasks">) => void;
  updateLongTermList: (id: string, updates: Partial<LongTermList>) => void;
  deleteLongTermList: (id: string) => void;

  // Notes operations
  updateDailyNote: (date: string, updates: Partial<DailyNote>) => void;
  updateWeeklyNote: (weekStart: string, updates: Partial<WeeklyNote>) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    if (!saved) return [];
    
    const parsed = JSON.parse(saved) as Task[];
    const now = new Date();
    const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    
    return parsed.map(t => {
      if (t.scale === "weekly" && !t.date) {
        if (t.linkedDailyIds && t.linkedDailyIds.length > 0) {
          const firstDaily = parsed.find(d => d.id === t.linkedDailyIds[0]);
          if (firstDaily && firstDaily.date) {
            const [y, m, d] = firstDaily.date.split("-").map(Number);
            return { ...t, date: format(startOfWeek(new Date(y, m - 1, d), { weekStartsOn: 1 }), "yyyy-MM-dd") };
          }
        }
        return { ...t, date: currentWeekStart };
      }
      return t;
    });
  });
  
  const [longTermLists, setLongTermLists] = useState<LongTermList[]>(() => {
    const saved = localStorage.getItem("longTermLists");
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyNotes, setDailyNotes] = useState<Record<string, DailyNote>>(() => {
    const saved = localStorage.getItem("dailyNotes");
    return saved ? JSON.parse(saved) : {};
  });

  const [weeklyNotes, setWeeklyNotes] = useState<Record<string, WeeklyNote>>(() => {
    const saved = localStorage.getItem("weeklyNotes");
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("longTermLists", JSON.stringify(longTermLists));
  }, [longTermLists]);

  useEffect(() => {
    localStorage.setItem("dailyNotes", JSON.stringify(dailyNotes));
  }, [dailyNotes]);

  useEffect(() => {
    localStorage.setItem("weeklyNotes", JSON.stringify(weeklyNotes));
  }, [weeklyNotes]);

  const addTask = (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "linkedWeeklyId" | "linkedDailyIds">) => {
    const now = Date.now();
    
    if (taskData.scale === "daily") {
      // Create daily and auto-create weekly counterpart
      const weeklyId = uuidv4();
      const dailyId = uuidv4();
      
      const [y, m, d] = (taskData.date || format(new Date(), "yyyy-MM-dd")).split("-").map(Number);
      const localDate = new Date(y, m - 1, d);
      const weekStartStr = format(startOfWeek(localDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const weeklyTask: Task = {
        ...taskData,
        id: weeklyId,
        scale: "weekly",
        date: weekStartStr,
        linkedWeeklyId: null,
        linkedDailyIds: [dailyId],
        createdAt: now,
        updatedAt: now,
      };
      
      const dailyTask: Task = {
        ...taskData,
        id: dailyId,
        scale: "daily",
        linkedWeeklyId: weeklyId,
        linkedDailyIds: [],
        createdAt: now,
        updatedAt: now,
      };
      
      setTasks(prev => [...prev, weeklyTask, dailyTask]);
    } else {
      const newTask: Task = {
        ...taskData,
        id: uuidv4(),
        linkedWeeklyId: null,
        linkedDailyIds: [],
        createdAt: now,
        updatedAt: now,
      };
      setTasks(prev => [...prev, newTask]);
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === id);
      if (taskIndex === -1) return prev;
      
      const task = prev[taskIndex];
      const now = Date.now();
      const nextTasks = [...prev];
      
      // Update the target task
      nextTasks[taskIndex] = { ...task, ...updates, updatedAt: now };
      
      // Handle two-way sync for daily/weekly
      const syncFields = ["title", "description", "location", "timeRange", "completed", "subTasks", "descriptionMode"] as const;
      const hasSyncUpdates = syncFields.some(field => field in updates);
      
      if (hasSyncUpdates) {
        const syncUpdates = syncFields.reduce((acc, field) => {
          if (field in updates) {
            // @ts-ignore
            acc[field] = updates[field];
          }
          return acc;
        }, {} as Partial<Task>);

        if (task.scale === "daily" && task.linkedWeeklyId) {
          // Sync to weekly
          const weeklyIndex = nextTasks.findIndex(t => t.id === task.linkedWeeklyId);
          if (weeklyIndex !== -1) {
            nextTasks[weeklyIndex] = { ...nextTasks[weeklyIndex], ...syncUpdates, updatedAt: now };
            
            // Sync to other linked dailies
            nextTasks[weeklyIndex].linkedDailyIds.forEach(dailyId => {
              if (dailyId !== id) {
                const dIndex = nextTasks.findIndex(t => t.id === dailyId);
                if (dIndex !== -1) {
                  nextTasks[dIndex] = { ...nextTasks[dIndex], ...syncUpdates, updatedAt: now };
                }
              }
            });
          }
        } else if (task.scale === "weekly") {
          // Sync to all linked dailies
          task.linkedDailyIds.forEach(dailyId => {
            const dIndex = nextTasks.findIndex(t => t.id === dailyId);
            if (dIndex !== -1) {
              nextTasks[dIndex] = { ...nextTasks[dIndex], ...syncUpdates, updatedAt: now };
            }
          });
        }
      }
      
      return nextTasks;
    });
  };

  const deleteTask = (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      
      // Delete does not sync!
      // But we should clean up the links
      let nextTasks = prev.filter(t => t.id !== id);
      
      if (task.scale === "daily" && task.linkedWeeklyId) {
        const weeklyIndex = nextTasks.findIndex(t => t.id === task.linkedWeeklyId);
        if (weeklyIndex !== -1) {
          nextTasks[weeklyIndex] = {
            ...nextTasks[weeklyIndex],
            linkedDailyIds: nextTasks[weeklyIndex].linkedDailyIds.filter(dId => dId !== id)
          };
        }
      } else if (task.scale === "weekly") {
        task.linkedDailyIds.forEach(dailyId => {
          const dIndex = nextTasks.findIndex(t => t.id === dailyId);
          if (dIndex !== -1) {
            nextTasks[dIndex] = {
              ...nextTasks[dIndex],
              linkedWeeklyId: null
            };
          }
        });
      }
      
      return nextTasks;
    });
  };

  const copyWeeklyToDaily = (weeklyId: string, date: string) => {
    setTasks(prev => {
      const weeklyIndex = prev.findIndex(t => t.id === weeklyId);
      if (weeklyIndex === -1) return prev;
      
      const weeklyTask = prev[weeklyIndex];
      const now = Date.now();
      const dailyId = uuidv4();
      
      const dailyTask: Task = {
        ...weeklyTask,
        id: dailyId,
        scale: "daily",
        date,
        linkedWeeklyId: weeklyId,
        linkedDailyIds: [],
        createdAt: now,
        updatedAt: now,
      };
      
      const nextTasks = [...prev];
      nextTasks[weeklyIndex] = {
        ...weeklyTask,
        linkedDailyIds: [...weeklyTask.linkedDailyIds, dailyId],
        updatedAt: now
      };
      
      nextTasks.push(dailyTask);
      return nextTasks;
    });
  };

  const copyWeeklyToWeekly = (weeklyId: string, targetWeekStart: string) => {
    setTasks(prev => {
      const weeklyIndex = prev.findIndex(t => t.id === weeklyId);
      if (weeklyIndex === -1) return prev;
      
      const weeklyTask = prev[weeklyIndex];
      
      // Don't copy if it's the same week
      if (weeklyTask.date === targetWeekStart) return prev;

      const now = Date.now();
      const newWeeklyId = uuidv4();
      
      const newWeeklyTask: Task = {
        ...weeklyTask,
        id: newWeeklyId,
        date: targetWeekStart,
        completed: false, // Reset completed status
        linkedWeeklyId: null,
        linkedDailyIds: [], // Do not copy daily links
        createdAt: now,
        updatedAt: now,
      };
      
      // If it has subtasks, copy them exactly as they are (including completed status)
      if (newWeeklyTask.subTasks) {
        newWeeklyTask.subTasks = newWeeklyTask.subTasks.map(st => ({ ...st, id: uuidv4() }));
      }
      
      return [...prev, newWeeklyTask];
    });
  };

  const addLongTermList = (listData: Omit<LongTermList, "id" | "tasks">) => {
    const newList: LongTermList = {
      ...listData,
      id: uuidv4(),
      tasks: [],
    };
    setLongTermLists(prev => [...prev, newList]);
  };

  const updateLongTermList = (id: string, updates: Partial<LongTermList>) => {
    setLongTermLists(prev => prev.map(list => list.id === id ? { ...list, ...updates } : list));
  };

  const deleteLongTermList = (id: string) => {
    setLongTermLists(prev => prev.filter(list => list.id !== id));
    // Also delete tasks in this list
    setTasks(prev => prev.filter(t => t.parentLongtermId !== id));
  };

  const updateDailyNote = (date: string, updates: Partial<DailyNote>) => {
    setDailyNotes(prev => ({
      ...prev,
      [date]: { ...prev[date], date, ...updates }
    }));
  };

  const updateWeeklyNote = (weekStart: string, updates: Partial<WeeklyNote>) => {
    setWeeklyNotes(prev => ({
      ...prev,
      [weekStart]: { ...prev[weekStart], weekStart, ...updates }
    }));
  };

  return (
    <AppContext.Provider value={{
      tasks,
      longTermLists,
      dailyNotes,
      weeklyNotes,
      selectedDate,
      setSelectedDate,
      addTask,
      updateTask,
      deleteTask,
      copyWeeklyToDaily,
      copyWeeklyToWeekly,
      addLongTermList,
      updateLongTermList,
      deleteLongTermList,
      updateDailyNote,
      updateWeeklyNote
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
};

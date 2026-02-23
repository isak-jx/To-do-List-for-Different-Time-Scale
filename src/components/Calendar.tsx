import React, { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";
import { useAppStore } from "../store/useStore";
import { TaskEditorModal } from "./TaskEditorModal";
import clsx from "clsx";
import { Task } from "../types";

export const Calendar: React.FC = () => {
  const { selectedDate, setSelectedDate, tasks, deleteTask } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter((t) => t.scale === "daily" && t.date === dateStr);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingTask(null);
    setIsEditorOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((date) => {
            const dateTasks = getTasksForDate(date);
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isCurrentDay = isToday(date);

            return (
              <button
                key={date.toString()}
                onClick={() => setSelectedDate(date)}
                className={clsx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-all",
                  !isCurrentMonth ? "opacity-40 bg-gray-50/50" : "bg-white",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm opacity-100"
                    : "border-transparent hover:border-gray-200 hover:bg-gray-50",
                  isCurrentDay && !isSelected && "bg-gray-100 font-bold text-gray-900"
                )}
              >
                <span className="text-sm">{format(date, "d")}</span>
                
                {dateTasks.length > 0 && (
                  <div className="absolute bottom-1.5 flex gap-0.5">
                    {dateTasks.slice(0, 3).map((t, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          t.completed ? "bg-emerald-400" : "bg-indigo-400"
                        )}
                      />
                    ))}
                    {dateTasks.length > 3 && (
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Events for {format(selectedDate, "MMM d")}
            </h3>
            <button
              onClick={() => setIsEditorOpen(true)}
              className="rounded-full p-1 text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {getTasksForDate(selectedDate).length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No events scheduled.</p>
            ) : (
              getTasksForDate(selectedDate).map(task => (
                <div key={task.id} className="group text-xs border rounded-lg p-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => handleEdit(task)}>
                  <div className="truncate flex-1">
                    <span className={clsx("font-medium", task.completed && "line-through text-gray-400")}>
                      {task.title}
                    </span>
                    {task.timeRange.start && (
                      <span className="text-gray-500 ml-2 block">
                        {task.timeRange.start} {task.timeRange.end ? `- ${task.timeRange.end}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <TaskEditorModal
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        task={editingTask}
        defaultScale="daily"
        defaultDate={selectedDate}
      />
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { useAppStore } from "../store/useStore";
import { TaskCard } from "./TaskCard";
import { TaskEditorModal } from "./TaskEditorModal";
import { Task } from "../types";
import { startOfWeek, format } from "date-fns";

export const WeeklyList: React.FC = () => {
  const { tasks, weeklyNotes, updateWeeklyNote, selectedDate } = useAppStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weeklyNote = weeklyNotes[weekStartStr];

  const [summary, setSummary] = useState(weeklyNote?.summary || "");

  useEffect(() => {
    setSummary(weeklyNote?.summary || "");
  }, [weeklyNote?.summary, weekStartStr]);

  const handleSummaryBlur = () => {
    updateWeeklyNote(weekStartStr, { summary });
  };

  const weeklyTasks = tasks.filter((t) => t.scale === "weekly" && t.date === weekStartStr);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingTask(null);
    setIsEditorOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Weekly Pool</h2>
          <p className="text-sm text-gray-500">Week of {format(weekStart, "MMM d, yyyy")}</p>
        </div>
        <button
          onClick={() => setIsEditorOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={handleSummaryBlur}
          maxLength={500}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none text-sm"
          placeholder="Write your weekly summary here..."
        />
      </div>

      <Droppable droppableId="weekly-pool" isDropDisabled={true}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-4"
          >
            {weeklyTasks.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center">
                <p className="text-sm font-medium text-gray-500">Weekly pool is empty</p>
                <p className="mt-1 text-xs text-gray-400">
                  Add tasks here to drag them to your daily schedule
                </p>
              </div>
            ) : (
              weeklyTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEdit={handleEdit}
                  isDraggable={true}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <TaskEditorModal
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        task={editingTask}
        defaultScale="weekly"
      />
    </div>
  );
};

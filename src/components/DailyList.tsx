import React, { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { Plus, ListTodo } from "lucide-react";
import { useAppStore } from "../store/useStore";
import { TaskCard } from "./TaskCard";
import { TaskEditorModal } from "./TaskEditorModal";
import { DailyLogModal } from "./DailyLogModal";
import { Task } from "../types";

export const DailyList: React.FC = () => {
  const { selectedDate, tasks } = useAppStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dailyTasks = tasks
    .filter((t) => t.scale === "daily" && t.date === dateStr)
    .sort((a, b) => {
      if (a.completed === b.completed) {
        return a.createdAt - b.createdAt;
      }
      return a.completed ? 1 : -1;
    });

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingTask(null);
    setIsEditorOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 border-r border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {format(selectedDate, "EEEE")}
          </h2>
          <p className="text-sm text-gray-500">{format(selectedDate, "MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            title="Daily Log"
          >
            <ListTodo className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      <Droppable droppableId={`daily-${dateStr}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-4 transition-colors ${
              snapshot.isDraggingOver ? "bg-indigo-50/50" : ""
            }`}
          >
            {dailyTasks.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white/50 text-center">
                <p className="text-sm font-medium text-gray-500">No tasks for today</p>
                <p className="mt-1 text-xs text-gray-400">
                  Drag tasks from Weekly or click Add Task
                </p>
              </div>
            ) : (
              dailyTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEdit={handleEdit}
                  isDraggable={false} // Daily tasks are not draggable in this design
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
        defaultScale="daily"
        defaultDate={selectedDate}
      />

      <DailyLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        date={selectedDate}
      />
    </div>
  );
};

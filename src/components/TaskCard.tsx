import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, Circle, Clock, MapPin, Edit2, Trash2 } from "lucide-react";
import { Task } from "../types";
import { useAppStore } from "../store/useStore";
import clsx from "clsx";

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  isDraggable?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onEdit, isDraggable = true }) => {
  const { updateTask, deleteTask } = useAppStore();

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { completed: !task.completed });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  const content = (
    <div className={clsx(
      "group relative flex flex-col gap-2 rounded-xl border p-4 transition-all",
      task.completed ? "border-gray-200 bg-gray-50 opacity-75" : "border-gray-200 bg-white shadow-sm hover:shadow-md",
      "cursor-pointer"
    )}
    onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-3">
        <button 
          onClick={toggleComplete}
          className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-emerald-500 transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <h4 className={clsx(
            "text-sm font-medium text-gray-900 truncate",
            task.completed && "line-through text-gray-500"
          )}>
            {task.title}
          </h4>
          
          {task.descriptionMode === "list" && task.subTasks && task.subTasks.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {task.subTasks.map(st => (
                <div key={st.id} className="flex items-start gap-2 text-xs" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={(e) => {
                      const newSubTasks = task.subTasks!.map(s => s.id === st.id ? { ...s, completed: e.target.checked } : s);
                      updateTask(task.id, { subTasks: newSubTasks });
                    }}
                    className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={clsx("flex-1", st.completed ? "line-through text-gray-400" : "text-gray-600")}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            task.description && (
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                {task.description}
              </p>
            )
          )}
          
          {(task.timeRange.start || task.location) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {task.timeRange.start && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {task.timeRange.start} {task.timeRange.end ? `- ${task.timeRange.end}` : ""}
                  </span>
                </div>
              )}
              {task.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px]">{task.location}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!isDraggable) {
    return content;
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            "mb-3",
            snapshot.isDragging && "opacity-80 scale-105 z-50"
          )}
          style={provided.draggableProps.style}
        >
          {content}
        </div>
      )}
    </Draggable>
  );
};

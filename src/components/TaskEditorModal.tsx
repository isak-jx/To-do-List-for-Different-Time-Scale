import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Task, TaskScale, SubTask } from "../types";
import { useAppStore } from "../store/useStore";
import { format, startOfWeek } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import clsx from "clsx";

interface TaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultScale?: TaskScale;
  defaultDate?: Date;
  parentLongtermId?: string | null;
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  isOpen,
  onClose,
  task,
  defaultScale = "daily",
  defaultDate,
  parentLongtermId = null,
}) => {
  const { addTask, updateTask, selectedDate } = useAppStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionMode, setDescriptionMode] = useState<"text" | "list">("text");
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  
  const [scale, setScale] = useState<TaskScale>(defaultScale);
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDescriptionMode(task.descriptionMode || "text");
      setSubTasks(task.subTasks || []);
      setScale(task.scale);
      setDate(task.date || "");
      setStartTime(task.timeRange.start || "");
      setEndTime(task.timeRange.end || "");
      setLocation(task.location || "");
    } else {
      setTitle("");
      setDescription("");
      setDescriptionMode("text");
      setSubTasks([]);
      setScale(defaultScale);
      setDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(selectedDate, "yyyy-MM-dd"));
      setStartTime("");
      setEndTime("");
      setLocation("");
    }
    setNewSubTaskTitle("");
  }, [task, isOpen, defaultScale, defaultDate, selectedDate]);

  if (!isOpen) return null;

  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    setSubTasks([...subTasks, { id: uuidv4(), title: newSubTaskTitle.trim(), completed: false }]);
    setNewSubTaskTitle("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      descriptionMode: scale === "event" ? "text" : descriptionMode,
      subTasks: scale === "event" ? [] : subTasks,
      scale,
      date: (scale === "daily" || scale === "event") ? date : (scale === "weekly" ? (task?.date || format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd")) : null),
      timeRange: {
        start: scale === "event" ? (startTime || null) : null,
        end: scale === "event" ? (endTime || null) : null,
      },
      location: scale === "event" ? (location.trim() || null) : null,
      completed: task ? task.completed : false,
      parentLongtermId: scale === "longterm" ? parentLongtermId : null,
    };

    if (task) {
      updateTask(task.id, taskData);
    } else {
      addTask(taskData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="What needs to be done?"
            />
          </div>

          {scale === "event" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                  placeholder="Add details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value as TaskScale)}
                    disabled={!!task || !!parentLongtermId}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="daily">Daily Task</option>
                    <option value="weekly">Weekly Task</option>
                    <option value="event">Event (Schedule)</option>
                    {parentLongtermId && <option value="longterm">Long-term</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Where?"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setDescriptionMode("text")}
                      className={clsx("px-3 py-1 text-xs font-medium rounded-md transition-colors", descriptionMode === "text" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionMode("list")}
                      className={clsx("px-3 py-1 text-xs font-medium rounded-md transition-colors", descriptionMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                      Checklist
                    </button>
                  </div>
                </div>
                
                {descriptionMode === "text" ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[120px]"
                    placeholder="Add details..."
                  />
                ) : (
                  <div className="space-y-2 rounded-lg border border-gray-300 p-3 min-h-[120px] bg-gray-50/50">
                    {subTasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 group bg-white p-2 rounded-md border border-gray-100 shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={st.completed} 
                          onChange={(e) => {
                            setSubTasks(subTasks.map(s => s.id === st.id ? { ...s, completed: e.target.checked } : s));
                          }} 
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <input 
                          type="text" 
                          value={st.title} 
                          onChange={(e) => {
                            setSubTasks(subTasks.map(s => s.id === st.id ? { ...s, title: e.target.value } : s));
                          }} 
                          className={clsx("flex-1 text-sm border-none focus:ring-0 p-0 bg-transparent", st.completed && "line-through text-gray-400")} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setSubTasks(subTasks.filter(s => s.id !== st.id))}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <X className="w-4 h-4"/>
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 p-2">
                      <Plus className="w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={newSubTaskTitle} 
                        onChange={e => setNewSubTaskTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubTask();
                          }
                        }}
                        placeholder="Add sub-task..." 
                        className="flex-1 text-sm border-none focus:ring-0 p-0 bg-transparent"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddSubTask} 
                        disabled={!newSubTaskTitle.trim()}
                        className="text-xs text-indigo-600 font-medium disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

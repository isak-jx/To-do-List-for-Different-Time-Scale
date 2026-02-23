import React, { useState } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useAppStore } from "../store/useStore";
import { TaskEditorModal } from "./TaskEditorModal";
import { TaskCard } from "./TaskCard";
import { Task, LongTermList } from "../types";
import clsx from "clsx";

export const LongTermPanel: React.FC = () => {
  const { longTermLists, tasks, addLongTermList, updateLongTermList, deleteLongTermList } = useAppStore();
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<LongTermList | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const toggleList = (id: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEditList = (list: LongTermList, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingList(list);
    setIsListModalOpen(true);
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this list and all its tasks?")) {
      deleteLongTermList(id);
    }
  };

  const handleAddTask = (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveListId(listId);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setActiveListId(task.parentLongtermId);
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Long-Term Goals</h1>
          <p className="text-sm text-gray-500">Manage your long-term projects and objectives</p>
        </div>
        <button
          onClick={() => { setEditingList(null); setIsListModalOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New List
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        {longTermLists.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white text-center">
            <p className="text-lg font-medium text-gray-900">No long-term lists yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create a list to start tracking your long-term goals
            </p>
            <button
              onClick={() => { setEditingList(null); setIsListModalOpen(true); }}
              className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
            >
              <Plus className="h-4 w-4" />
              Create List
            </button>
          </div>
        ) : (
          longTermLists.map(list => {
            const isExpanded = expandedLists.has(list.id);
            const listTasks = tasks.filter(t => t.scale === "longterm" && t.parentLongtermId === list.id);
            const completedCount = listTasks.filter(t => t.completed).length;
            const progress = listTasks.length === 0 ? 0 : Math.round((completedCount / listTasks.length) * 100);

            return (
              <div key={list.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleList(list.id)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{listTasks.length} tasks</span>
                        {list.startDate && list.endDate && (
                          <span>{list.startDate} to {list.endDate}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-8 text-right">{progress}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleAddTask(list.id, e)}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleEditList(list, e)}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    {listTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No tasks in this list yet.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {listTasks.map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            onEdit={handleEditTask}
                            isDraggable={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* List Editor Modal */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingList ? "Edit List" : "New List"}
            </h2>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                const startDate = formData.get("startDate") as string;
                const endDate = formData.get("endDate") as string;
                
                if (editingList) {
                  updateLongTermList(editingList.id, { name, startDate, endDate });
                } else {
                  addLongTermList({ name, startDate, endDate });
                }
                setIsListModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">List Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingList?.name}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingList?.startDate || ""}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={editingList?.endDate || ""}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Editor Modal */}
      <TaskEditorModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={editingTask}
        defaultScale="longterm"
        parentLongtermId={activeListId}
      />
    </div>
  );
};

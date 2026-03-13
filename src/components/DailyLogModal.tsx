import React, { useState } from "react";
import { X, Plus, Trash2, Edit2, Check, Tag } from "lucide-react";
import { useAppStore } from "../store/useStore";
import { format } from "date-fns";
import clsx from "clsx";
import { LogTag } from "../types";

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
}

export const DailyLogModal: React.FC<DailyLogModalProps> = ({ isOpen, onClose, date }) => {
  const { logTags, logEntries, addLogEntry, deleteLogEntry, addLogTag, updateLogTag, deleteLogTag } = useAppStore();
  const dateStr = format(date, "yyyy-MM-dd");
  
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [content, setContent] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string>(logTags[0]?.id || "");
  
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#4f46e5");

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("");

  if (!isOpen) return null;

  const entriesForDate = logEntries
    .filter(e => e.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedTagId || !time) return;
    
    addLogEntry({
      date: dateStr,
      time,
      tagId: selectedTagId,
      content: content.trim()
    });
    
    setContent("");
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    addLogTag({ name: newTagName.trim(), color: newTagColor });
    setNewTagName("");
  };

  const startEditTag = (tag: LogTag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const saveEditTag = () => {
    if (!editingTagId || !editTagName.trim()) return;
    updateLogTag(editingTagId, { name: editTagName.trim(), color: editTagColor });
    setEditingTagId(null);
  };

  const renderTagManager = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Manage Tags</h3>
        <button onClick={() => setIsManagingTags(false)} className="text-xs text-indigo-600 hover:text-indigo-800">
          Back to Logs
        </button>
      </div>

      <form onSubmit={handleAddTag} className="flex gap-2 items-center">
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          className="h-8 w-8 rounded cursor-pointer border-0 p-0"
        />
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button type="submit" className="rounded-md bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100">
          <Plus className="h-4 w-4" />
        </button>
      </form>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {logTags.map(tag => (
          <div key={tag.id} className="flex items-center justify-between rounded-md border border-gray-200 p-2">
            {editingTagId === tag.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="color"
                  value={editTagColor}
                  onChange={(e) => setEditTagColor(e.target.value)}
                  className="h-6 w-6 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button onClick={saveEditTag} className="text-emerald-600 hover:text-emerald-700">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingTagId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-gray-700">{tag.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEditTag(tag)} className="p-1 text-gray-400 hover:text-indigo-600">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteLogTag(tag.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Log - {format(date, "MMM d, yyyy")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {isManagingTags ? (
            renderTagManager()
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4">
                {entriesForDate.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-500">
                    No logs for today yet.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pb-4">
                    {entriesForDate.map(entry => {
                      const tag = logTags.find(t => t.id === entry.tagId);
                      return (
                        <div key={entry.id} className="relative pl-6 group">
                          <div 
                            className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-white"
                            style={{ backgroundColor: tag?.color || '#ccc' }}
                          />
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-500">{entry.time}</span>
                                {tag && (
                                  <span 
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.content}</p>
                            </div>
                            <button
                              onClick={() => deleteLogEntry(entry.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 mt-auto">
                <form onSubmit={handleAddEntry} className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                    <div className="flex-1 flex gap-2">
                      <select
                        value={selectedTagId}
                        onChange={(e) => setSelectedTagId(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="" disabled>Select Tag</option>
                        {logTags.map(tag => (
                          <option key={tag.id} value={tag.id}>{tag.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsManagingTags(true)}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
                        title="Manage Tags"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="What are you doing?"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={!content.trim() || !selectedTagId}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

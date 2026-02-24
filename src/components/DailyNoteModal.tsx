import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../store/useStore";
import { format } from "date-fns";
import { StarRating } from "./StarRating";

interface DailyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
}

export const DailyNoteModal: React.FC<DailyNoteModalProps> = ({ isOpen, onClose, date }) => {
  const { dailyNotes, updateDailyNote } = useAppStore();
  const dateStr = format(date, "yyyy-MM-dd");
  const note = dailyNotes[dateStr];

  const [summary, setSummary] = useState(note?.summary || "");

  useEffect(() => {
    if (isOpen) {
      setSummary(note?.summary || "");
    }
  }, [isOpen, note?.summary]);

  if (!isOpen) return null;

  const handleRatingChange = (rating: number) => {
    updateDailyNote(dateStr, { rating });
  };

  const handleSummaryBlur = () => {
    updateDailyNote(dateStr, { summary });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Daily Note - {format(date, "MMM d, yyyy")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <StarRating rating={note?.rating || null} onChange={handleRatingChange} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={handleSummaryBlur}
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
              placeholder="How was your day? (Max 100 characters)"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {summary.length}/100
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

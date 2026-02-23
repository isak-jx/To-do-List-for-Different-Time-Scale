import React from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Calendar } from "./Calendar";
import { DailyList } from "./DailyList";
import { WeeklyList } from "./WeeklyList";
import { useAppStore } from "../store/useStore";

export const MainLayout: React.FC = () => {
  const { copyWeeklyToDaily } = useAppStore();

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable area
    if (!destination) return;

    // If dropped in the same place
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Handle dropping from weekly to daily
    if (
      source.droppableId === "weekly-pool" &&
      destination.droppableId.startsWith("daily-")
    ) {
      const targetDate = destination.droppableId.replace("daily-", "");
      copyWeeklyToDaily(draggableId, targetDate);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid h-full grid-cols-1 md:grid-cols-3 overflow-hidden">
        <div className="h-full overflow-hidden">
          <Calendar />
        </div>
        <div className="h-full overflow-hidden">
          <DailyList />
        </div>
        <div className="h-full overflow-hidden">
          <WeeklyList />
        </div>
      </div>
    </DragDropContext>
  );
};

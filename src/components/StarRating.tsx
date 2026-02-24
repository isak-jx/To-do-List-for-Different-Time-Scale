import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, readonly = false }) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (readonly) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    const newRating = index + (percent < 0.5 ? 0.5 : 1);
    setHoverRating(newRating);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (readonly || !onChange) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    const newRating = index + (percent < 0.5 ? 0.5 : 1);
    onChange(newRating);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(null);
  };

  const currentRating = hoverRating !== null ? hoverRating : (rating || 0);

  return (
    <div className="flex items-center gap-1" onMouseLeave={handleMouseLeave}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fillPercentage = Math.max(0, Math.min(100, (currentRating - index) * 100));
        
        return (
          <div
            key={index}
            className="relative cursor-pointer"
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={(e) => handleClick(e, index)}
          >
            <Star className="h-5 w-5 text-gray-300" strokeWidth={1.5} />
            <div 
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" strokeWidth={1.5} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

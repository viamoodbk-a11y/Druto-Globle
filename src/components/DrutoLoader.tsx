import { useEffect, useState, forwardRef } from "react";

/**
 * Fun brand-themed loading animation
 * Cycles through different business category emojis with bouncing animation
 */

const brandEmojis = ["🎁", "☕", "✂️", "🏋️", "🛍️", "💇", "🚗", "💎", "🐾", "📚", "👗", "📱"];

export const DrutoLoader = forwardRef<HTMLDivElement, { message?: string }>(
  ({ message = "Loading..." }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % brandEmojis.length);
      }, 400);
      return () => clearInterval(interval);
    }, []);

    return (
      <div ref={ref} className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        {/* Animated food icons */}
        <div className="relative h-24 w-24 flex items-center justify-center">
          {/* Outer rotating ring of food */}
          <div className="absolute inset-0 animate-spin-slow">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="absolute text-2xl"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `rotate(${i * 60}deg) translateY(-36px) rotate(-${i * 60}deg)`,
                  opacity: 0.6,
                }}
              >
                {brandEmojis[(currentIndex + i) % brandEmojis.length]}
              </span>
            ))}
          </div>
          
          {/* Center bouncing main emoji */}
          <span className="text-5xl animate-food-bounce z-10">
            {brandEmojis[currentIndex]}
          </span>
        </div>

        {/* Loading text with shimmer */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-foreground animate-pulse">
            {message}
          </p>
          
          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

DrutoLoader.displayName = "DrutoLoader";
/**
 * Compact loader for smaller spaces
 */
export const DrutoLoaderCompact = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % brandEmojis.length);
    }, 350);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <span className="text-3xl animate-food-bounce">
        {brandEmojis[currentIndex]}
      </span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
};

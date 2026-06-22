import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '../../utils/timeUtils'; // Import the shared formatDuration

export default function Timer({ isRunning, startTime, totalPauseDuration, initialAccumulatedDuration = 0 }) {
  const [currentDisplayDurationMs, setCurrentDisplayDurationMs] = useState(initialAccumulatedDuration);
  const startTimeMs = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && startTime) {
      startTimeMs.current = new Date(startTime).getTime();
      // Clear any existing interval to prevent multiple timers running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const timeNowMs = Date.now();
        let totalLapsedMs = timeNowMs - startTimeMs.current;
        let calculatedDuration = initialAccumulatedDuration + totalLapsedMs;

        if (totalPauseDuration) {
          calculatedDuration -= totalPauseDuration;
        }
        setCurrentDisplayDurationMs(calculatedDuration);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setCurrentDisplayDurationMs(initialAccumulatedDuration);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime, totalPauseDuration, initialAccumulatedDuration]);

  return (
    <>
      <p>{formatDuration(currentDisplayDurationMs / 1000)}</p>
    </>
  )
}
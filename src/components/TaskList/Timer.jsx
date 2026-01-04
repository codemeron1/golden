import { useState, useEffect, useRef } from 'react';

export default function Timer({ isRunning, startTime,  totalPauseDuration }) {
  const [currentDuration, setCurrentDuration] = useState(0);
  const startTimeMs = useRef(0);

  useEffect(() => {
    startTimeMs.current = new Date(startTime).getTime();
    const interval = setInterval(() => {
      if (isRunning) {
        const timeNowMs = Date.now();
        let totalDurationMs = timeNowMs - startTimeMs.current;
        if ( totalPauseDuration ) {
          // console.log('deducating totalDurationMs -= totalPauseDuration; ', {
          //   totalPauseDuration, totalDurationMs
          // })
          totalDurationMs -= totalPauseDuration;
        }
        // 68155
        const totalMinutes = Math.floor(totalDurationMs / 60000);
        const totalHour = Math.floor(totalMinutes / 60);
        const totalMinute = totalMinutes % 60;
        const totalSecond = Math.floor((totalDurationMs % 60000) / 1000);

        const totalHourPadded = String(totalHour).padStart(2, 0);
        const totalMinutePadded = String(totalMinute).padStart(2, 0);
        const totalSecondPadded = String(totalSecond).padStart(2, 0);

        setCurrentDuration(`${totalHourPadded}:${totalMinutePadded}:${totalSecondPadded}`);
      }
    }, 1000); // 1 second


    return () => clearInterval(interval);
  }, [isRunning, startTime,  totalPauseDuration])

  return (
    <>
      <h1>{currentDuration}</h1>
    </>
  )
}
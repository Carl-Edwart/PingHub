import { useEffect, useState, useCallback, useRef } from 'react';
import { TimerService } from '@/services/timerService';

interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  start: (duration: number) => void;
  pause: () => void;
  resume: () => void;
  reset: (duration: number) => void;
  stop: () => void;
}

export function useTimer(initialDuration: number = 0, onExpire?: () => void): UseTimerReturn {
  const timerServiceRef = useRef<TimerService>(new TimerService());
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(
    (duration: number) => {
      const timer = timerServiceRef.current;
      timer.start(
        duration,
        (remaining) => {
          setTimeLeft(Math.max(0, remaining));
        },
        () => {
          setIsRunning(false);
          if (onExpire) onExpire();
        }
      );
      setIsRunning(true);
    },
    [onExpire]
  );

  const pause = useCallback(() => {
    timerServiceRef.current.pause();
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    timerServiceRef.current.resume(
      (remaining) => {
        setTimeLeft(Math.max(0, remaining));
      },
      () => {
        setIsRunning(false);
        if (onExpire) onExpire();
      }
    );
    setIsRunning(true);
  }, [onExpire]);

  const reset = useCallback((duration: number) => {
    timerServiceRef.current.reset(duration);
    setTimeLeft(duration);
    setIsRunning(false);
  }, []);

  const stop = useCallback(() => {
    timerServiceRef.current.stop();
    setTimeLeft(0);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      timerServiceRef.current.stop();
    };
  }, []);

  return {
    timeLeft,
    isRunning,
    start,
    pause,
    resume,
    reset,
    stop,
  };
}

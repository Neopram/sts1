import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  operationDateTime: string; // ISO format
  onCountdownEnd?: () => void;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * CountdownTimer Component
 * Displays a live countdown to scheduled STS operation
 * 
 * Features:
 * - Updates every second
 * - Shows hours, minutes, seconds
 * - Calls callback when countdown ends
 * - Handles invalid dates gracefully
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  operationDateTime,
  onCountdownEnd
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const updateCountdown = () => {
      try {
        const now = new Date();
        const targetTime = new Date(operationDateTime);

        // Validate target time
        if (isNaN(targetTime.getTime())) {
          console.error('Invalid operation date:', operationDateTime);
          return;
        }

        const diff = targetTime.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining({
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true
          });
          onCountdownEnd?.();
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining({
          hours,
          minutes,
          seconds,
          isExpired: false
        });
      } catch (error) {
        console.error('Countdown calculation error:', error);
      }
    };

    // Initial update
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [operationDateTime, onCountdownEnd]);

  const isWarning = timeRemaining.hours < 1 && !timeRemaining.isExpired;
  const formatTime = (value: number) => String(value).padStart(2, '0');

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Time to STS Operation
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Hours */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className={`text-4xl font-bold ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>
            {formatTime(timeRemaining.hours)}
          </div>
          <div className="text-sm text-gray-600 mt-2">Hours</div>
        </div>

        {/* Minutes */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className={`text-4xl font-bold ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>
            {formatTime(timeRemaining.minutes)}
          </div>
          <div className="text-sm text-gray-600 mt-2">Minutes</div>
        </div>

        {/* Seconds */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className={`text-4xl font-bold ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>
            {formatTime(timeRemaining.seconds)}
          </div>
          <div className="text-sm text-gray-600 mt-2">Seconds</div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-4">
        {timeRemaining.isExpired ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-center font-semibold">
            ✗ Operation Time Passed
          </div>
        ) : isWarning ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-center font-semibold">
            ⚠ Less than 1 hour to operation
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded text-center font-semibold">
            ✓ Operation on schedule
          </div>
        )}
      </div>

      {/* Scheduled Time Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Scheduled: {new Date(operationDateTime).toLocaleString()}
      </div>
    </div>
  );
};

export default CountdownTimer;
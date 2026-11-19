import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function RegistrationCountdown() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const registrationDeadline = new Date('2026-11-29T23:59:59').getTime();
      const now = new Date().getTime();
      const difference = registrationDeadline - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`py-2 sm:py-3 px-3 sm:px-4 text-center border-b ${
      timeLeft.isExpired
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/40'
    }`}>
      <div className="container mx-auto flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft.isExpired ? 'text-red-400' : 'text-amber-400'} animate-pulse`} />

        {timeLeft.isExpired ? (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-red-300">
              🚨 Registration has ended
            </span>
          </div>
        ) : (
          <>
            <span className="text-[11px] sm:text-xs font-bold text-amber-200 uppercase tracking-wide">
              Registration Ends In:
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Days */}
              <div className="flex flex-col items-center bg-black/40 rounded-lg px-2 sm:px-2.5 py-1.5 border border-amber-500/30">
                <span className="text-xs sm:text-sm font-black text-amber-300 leading-none">
                  {timeLeft.days}
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-bold">
                  Days
                </span>
              </div>

              <span className="text-amber-300 font-black text-sm">:</span>

              {/* Hours */}
              <div className="flex flex-col items-center bg-black/40 rounded-lg px-2 sm:px-2.5 py-1.5 border border-amber-500/30">
                <span className="text-xs sm:text-sm font-black text-amber-300 leading-none">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-bold">
                  Hours
                </span>
              </div>

              <span className="text-amber-300 font-black text-sm">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center bg-black/40 rounded-lg px-2 sm:px-2.5 py-1.5 border border-amber-500/30">
                <span className="text-xs sm:text-sm font-black text-amber-300 leading-none">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-bold">
                  Mins
                </span>
              </div>

              <span className="text-amber-300 font-black text-sm">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center bg-black/40 rounded-lg px-2 sm:px-2.5 py-1.5 border border-amber-500/30">
                <span className="text-xs sm:text-sm font-black text-amber-300 leading-none">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-bold">
                  Secs
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Clock, Trophy } from 'lucide-react';

export default function RegistrationCountdown() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
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
          milliseconds: 0,
          isExpired: true,
        });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        const milliseconds = difference % 1000;

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          isExpired: false,
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 50);
    return () => clearInterval(timer);
  }, []);

  const TimeBox = ({ value, label }: { value: string | number; label: string }) => (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-lg blur opacity-70 group-hover:opacity-100 transition duration-300 group-hover:blur-md" />
      <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-lg px-3 py-2 border border-amber-400/50 shadow-xl shadow-amber-500/30 min-w-14">
        <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 leading-none transition-all duration-150">
          {value}
        </span>
        <span className="text-[8px] sm:text-[9px] text-amber-200/60 font-bold uppercase tracking-wider mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes shine {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes smooth-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .shine-effect {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          background-size: 1000px 100%;
          animation: shine 5s infinite;
        }
        .smooth-count {
          transition: all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
      `}</style>

      <div className={`relative overflow-hidden py-2.5 sm:py-3.5 px-3 sm:px-4 text-center border-b transition-all duration-500 ${
        timeLeft.isExpired
          ? 'bg-gradient-to-r from-red-600/20 via-red-500/15 to-red-600/20 border-red-500/50'
          : 'bg-gradient-to-r from-amber-600/12 via-yellow-500/18 to-amber-600/12 border-amber-500/50'
      }`}>
        {/* Animated background shine effect */}
        <div className="absolute inset-0 shine-effect opacity-25" />

        {/* Decorative blur elements */}
        <div className="absolute top-0 left-1/3 w-24 h-24 bg-amber-500/15 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl" />

        <div className="container mx-auto flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap relative z-10">
          {timeLeft.isExpired ? (
            <>
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 animate-bounce shrink-0" />
              <span className="text-sm sm:text-base font-black text-red-300 drop-shadow-lg">
                🚨 Registration Ended
              </span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />

              <span className="text-xs sm:text-sm font-bold text-amber-100 uppercase tracking-widest drop-shadow">
                Register Closes In
              </span>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <TimeBox value={String(timeLeft.days).padStart(2, '0')} label="Days" />
                <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 animate-pulse">
                  :
                </span>
                <TimeBox value={String(timeLeft.hours).padStart(2, '0')} label="Hours" />
                <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 animate-pulse">
                  :
                </span>
                <TimeBox value={String(timeLeft.minutes).padStart(2, '0')} label="Mins" />
                <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 animate-pulse">
                  :
                </span>
                <TimeBox value={String(timeLeft.seconds).padStart(2, '0')} label="Secs" />
              </div>

              <span className="text-[10px] sm:text-xs font-bold text-amber-300 drop-shadow-lg hidden sm:inline">
                🏏 Hurry!
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}

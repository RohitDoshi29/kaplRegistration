import React, { useState, useEffect } from 'react';
import { Clock, Trophy } from 'lucide-react';

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

  const TimeBox = ({ value, label }: { value: string | number; label: string }) => (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-md blur opacity-60 group-hover:opacity-100 transition duration-300" />
      <div className="relative flex items-center justify-center gap-0.5 bg-gradient-to-br from-slate-800 to-black rounded-md px-1.5 py-0.5 border border-amber-400/40 shadow-lg shadow-amber-500/20">
        <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-300">
          {value}
        </span>
        <span className="text-[7px] text-amber-200/50 font-bold">
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
        .shine-effect {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          background-size: 1000px 100%;
          animation: shine 4s infinite;
        }
      `}</style>

      <div className={`relative overflow-hidden py-1.5 sm:py-2 px-3 sm:px-4 text-center border-b transition-all duration-500 ${
        timeLeft.isExpired
          ? 'bg-gradient-to-r from-red-600/15 via-red-500/10 to-red-600/15 border-red-500/40'
          : 'bg-gradient-to-r from-amber-600/10 via-yellow-500/15 to-amber-600/10 border-amber-500/40'
      }`}>
        {/* Animated background shine effect */}
        <div className="absolute inset-0 shine-effect opacity-20" />

        <div className="container mx-auto flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap relative z-10">
          {timeLeft.isExpired ? (
            <>
              <Trophy className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
              <span className="text-[11px] sm:text-xs font-black text-red-300 drop-shadow">
                Registration Ended
              </span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" style={{ animationDuration: '4s' }} />
              <span className="text-[10px] sm:text-xs font-bold text-amber-200 uppercase tracking-tight">
                Ends In:
              </span>

              <div className="flex items-center gap-0.5">
                <TimeBox value={String(timeLeft.days).padStart(2, '0')} label="D" />
                <span className="text-amber-400 font-black text-xs">:</span>
                <TimeBox value={String(timeLeft.hours).padStart(2, '0')} label="H" />
                <span className="text-amber-400 font-black text-xs">:</span>
                <TimeBox value={String(timeLeft.minutes).padStart(2, '0')} label="M" />
                <span className="text-amber-400 font-black text-xs">:</span>
                <TimeBox value={String(timeLeft.seconds).padStart(2, '0')} label="S" />
              </div>

              <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 drop-shadow hidden sm:inline">
                🏏 Register Now!
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { Clock, Zap, Trophy } from 'lucide-react';

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
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300 group-hover:blur-md" />
      <div className="relative flex flex-col items-center bg-gradient-to-br from-slate-900 via-slate-950 to-black rounded-xl px-2.5 sm:px-4 py-2 sm:py-3 border border-amber-400/40 shadow-2xl shadow-amber-500/20">
        <span className="text-sm sm:text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 leading-none drop-shadow-lg">
          {value}
        </span>
        <span className="text-[9px] sm:text-[10px] text-amber-200/60 uppercase font-bold tracking-widest mt-1">
          {label}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(245, 158, 11, 0.2); }
          50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(245, 158, 11, 0.3); }
        }
        @keyframes shine {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .shine-effect {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          background-size: 1000px 100%;
          animation: shine 3s infinite;
        }
      `}</style>

      <div className={`relative overflow-hidden py-3 sm:py-4 px-3 sm:px-4 text-center border-b transition-all duration-500 ${
        timeLeft.isExpired
          ? 'bg-gradient-to-r from-red-600/20 via-red-500/15 to-red-600/20 border-red-500/60'
          : 'bg-gradient-to-r from-amber-600/15 via-yellow-500/20 to-amber-600/15 border-amber-500/60'
      }`}>
        {/* Animated background shine effect */}
        <div className="absolute inset-0 shine-effect opacity-30" />

        {/* Decorative elements */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl animate-pulse animation-delay-700" />

        <div className="container mx-auto flex flex-col items-center justify-center gap-3 sm:gap-4 relative z-10">
          {/* Header with icon */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {timeLeft.isExpired ? (
              <>
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 animate-bounce" />
                <span className="text-sm sm:text-base font-black text-red-300">
                  🚨 REGISTRATION CLOSED
                </span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-[12px] sm:text-sm font-black text-amber-100 uppercase tracking-widest drop-shadow-lg">
                  ⏰ Registration Closes In
                </span>
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-pulse" />
              </>
            )}
          </div>

          {/* Countdown display */}
          {!timeLeft.isExpired && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3 flex-wrap">
              <TimeBox value={String(timeLeft.days).padStart(2, '0')} label="Days" />

              <div className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 animate-pulse">
                ◆
              </div>

              <TimeBox value={String(timeLeft.hours).padStart(2, '0')} label="Hours" />

              <div className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 animate-pulse">
                ◆
              </div>

              <TimeBox value={String(timeLeft.minutes).padStart(2, '0')} label="Minutes" />

              <div className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 animate-pulse">
                ◆
              </div>

              <TimeBox value={String(timeLeft.seconds).padStart(2, '0')} label="Seconds" />
            </div>
          )}

          {/* Call to action text */}
          {!timeLeft.isExpired && (
            <div className="text-[10px] sm:text-xs font-bold text-amber-200/80 uppercase tracking-widest drop-shadow-lg">
              🏏 Limited Time • Secure Your Spot Now!
            </div>
          )}
        </div>
      </div>
    </>
  );
}

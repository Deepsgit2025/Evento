import React, { useEffect, useState } from 'react';
import { Typography } from './Typography';
import { TypographyProps } from './Typography';

interface WeddingCountdownProps {
  date: string | null | undefined;
  textProps?: Omit<TypographyProps, 'children'>;
  fallback?: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getRemaining(target: Date): Remaining | null {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

/**
 * Live ticking countdown to midnight (local time) of the wedding date.
 * Ticks every second; renders a compact "Xd Yh Zm Ws" style label.
 */
export function WeddingCountdown({ date, textProps, fallback = 'Happily Ever After' }: WeddingCountdownProps) {
  const target = React.useMemo(() => {
    if (!date) return null;
    // "YYYY-MM-DD" must be parsed as local time — new Date(isoString) treats
    // date-only ISO strings as UTC midnight, which shifts the target to the
    // previous day in negative-UTC-offset timezones.
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const parsed = isoMatch
      ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
      : new Date(date);
    if (isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }, [date]);

  const [remaining, setRemaining] = useState<Remaining | null>(() => (target ? getRemaining(target) : null));

  useEffect(() => {
    if (!target) {
      setRemaining(null);
      return;
    }
    setRemaining(getRemaining(target));
    const interval = setInterval(() => {
      setRemaining(getRemaining(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target || !remaining) {
    return <Typography {...textProps}>{fallback}</Typography>;
  }

  const label = remaining.days > 0
    ? `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m to go`
    : `${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s to go`;

  return <Typography {...textProps}>{label}</Typography>;
}

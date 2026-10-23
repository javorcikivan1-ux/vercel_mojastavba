export const minutesFromTime = (value: string): number | null => {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const getDefaultAttendanceBreak = (profile: any) => ({
  has_break: Boolean(profile?.default_break_start && profile?.default_break_end),
  break_start: profile?.default_break_start || '12:00',
  break_end: profile?.default_break_end || '12:45'
});

export const defaultBreakPayload = (form: any) => {
  if (!form.has_break) return { default_break_start: null, default_break_end: null };
  const start = minutesFromTime(form.break_start);
  const end = minutesFromTime(form.break_end);
  if (start === null || end === null || end <= start) {
    throw new Error('Koniec predvoleného obeda musí byť neskôr ako začiatok.');
  }
  return { default_break_start: form.break_start, default_break_end: form.break_end };
};

export const calculateAttendanceMinutes = (
  startTime: string,
  endTime: string,
  hasBreak = false,
  breakStart = '',
  breakEnd = ''
) => {
  const start = minutesFromTime(startTime);
  let end = minutesFromTime(endTime);

  if (start === null || end === null) {
    return { grossMinutes: 0, breakMinutes: 0, netMinutes: 0, valid: false };
  }
  if (end < start) end += 24 * 60;
  const grossMinutes = end - start;

  if (!hasBreak) {
    return { grossMinutes, breakMinutes: 0, netMinutes: grossMinutes, valid: grossMinutes > 0 };
  }

  let pauseStart = minutesFromTime(breakStart);
  let pauseEnd = minutesFromTime(breakEnd);
  if (pauseStart === null || pauseEnd === null || grossMinutes <= 0) {
    return { grossMinutes, breakMinutes: 0, netMinutes: grossMinutes, valid: false };
  }

  if (pauseStart < start) pauseStart += 24 * 60;
  while (pauseEnd <= pauseStart) pauseEnd += 24 * 60;

  const breakMinutes = pauseEnd - pauseStart;
  const valid = pauseStart >= start && pauseEnd <= end && breakMinutes > 0 && breakMinutes < grossMinutes;

  return {
    grossMinutes,
    breakMinutes: valid ? breakMinutes : 0,
    netMinutes: valid ? grossMinutes - breakMinutes : grossMinutes,
    valid
  };
};

export const parseAttendanceRangeHours = (value: string): number | null => {
  const parts = (value || '').split(',');
  let minutes = 0;
  for (const part of parts) {
    const match = part.trim().match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/);
    if (!match) return null;
    const [, h1, m1, h2, m2] = match.map(Number);
    if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return null;
    const duration = h2 * 60 + m2 - h1 * 60 - m1;
    minutes += duration < 0 ? duration + 1440 : duration;
  }
  return minutes / 60;
};

export const formatAttendanceRanges = (logs: any[]): string => {
  // Keep each recorded interval: merging the earliest start and latest end
  // would turn gaps between separate entries into worked time.
  return [...logs]
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    .map(formatAttendanceRange)
    .join(', ');
};

export const formatAttendanceRange = (log: any): string => {
  if (!log?.start_time || !log?.end_time) return '---';
  if (log.break_start && log.break_end) {
    return `${log.start_time} - ${log.break_start}, ${log.break_end} - ${log.end_time}`;
  }
  return `${log.start_time} - ${log.end_time}`;
};

const minutesFromTime = (value: string): number | null => {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
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

export const formatAttendanceRange = (log: any): string => {
  if (!log?.start_time || !log?.end_time) return '---';
  if (log.break_start && log.break_end) {
    return `${log.start_time} - ${log.break_start}, ${log.break_end} - ${log.end_time}`;
  }
  return `${log.start_time} - ${log.end_time}`;
};

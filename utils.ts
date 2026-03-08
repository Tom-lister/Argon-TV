export const formatTime = (utcMs: number): string => {
  const date = new Date(utcMs);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const getEightAmDate = (date: Date, dayOffset: number = 0): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + dayOffset,
    8,
  );
};

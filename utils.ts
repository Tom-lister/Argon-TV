import { Video } from "./database";
import {
  ProgrammingItem,
  ScheduleIdent,
  ScheduleItem,
  ScheduleVideo,
} from "./schedule";

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

export const isFirstForDay = (video: ScheduleVideo | ScheduleIdent) => {
  const videoStartDate = new Date(video.startTime);
  const videoStartHour = videoStartDate.getHours();
  const videoStartMinute = videoStartDate.getMinutes();
  const videoStartSecond = videoStartDate.getSeconds();

  return (
    videoStartHour === 8 && videoStartMinute === 0 && videoStartSecond === 0
  );
};

export const flattenProgramming = (programming: ProgrammingItem[]): Video[] =>
  programming.flatMap((item) => {
    if ("id" in item) {
      return [item];
    }
    return item.videos;
  });

export const flattenSchedule = (
  schedule: ScheduleItem[],
): (ScheduleVideo | ScheduleIdent)[] =>
  schedule.flatMap((item) => {
    if ("id" in item) {
      return [item];
    }
    return item.videos;
  });

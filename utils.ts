import { DateTime } from "luxon";
import { UK_TIMEZONE } from "./constants.js";
import { Video } from "./database";
import {
  ProgrammingItem,
  ScheduleIdent,
  ScheduleItem,
  ScheduleVideo,
} from "./schedule";

export const formatTime = (utcMs: number): string => {
  return DateTime.fromMillis(utcMs, { zone: UK_TIMEZONE }).toFormat("HH:mm");
};

export const getEightAmDate = (date: Date, dayOffset: number = 0): Date => {
  return DateTime.fromMillis(date.getTime(), { zone: UK_TIMEZONE })
    .plus({ days: dayOffset })
    .set({ hour: 8, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();
};

export const getStartOfDay = (utcMs: number): number =>
  DateTime.fromMillis(utcMs, { zone: UK_TIMEZONE }).startOf("day").toMillis();

export const isFirstForDay = (video: ScheduleVideo | ScheduleIdent) => {
  const dt = DateTime.fromMillis(video.startTime, { zone: UK_TIMEZONE });
  return (
    dt.hour === 8 && dt.minute === 0 && dt.second === 0 && dt.millisecond === 0
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

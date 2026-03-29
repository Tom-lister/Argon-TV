import { DateTime } from "luxon";

export const SEED = 123456778;

/** All broadcast times and day boundaries use this IANA zone (GMT/BST). */
export const UK_TIMEZONE = "Europe/London";

/** First schedule day begins at 08:00 UK time on this calendar date. */
export const SCHEDULE_ANCHOR = DateTime.fromObject(
  {
    year: 2026,
    month: 3,
    day: 8,
    hour: 8,
    minute: 0,
    second: 0,
    millisecond: 0,
  },
  { zone: UK_TIMEZONE },
);
// 16 hours
export const DAILY_RUNTIME = 1000 * 60 * 60 * 16;

export const LARGE_ITEM_PROBABILITIES = [0, 0, 0.1, 0.2, 0.3, 0.45, 0.7, 1];
export const LONG_VIDEO_TIME = 60 * 20;

export const OFF_AIR_VIDEO_ID = "SLrBR9HXR7g";

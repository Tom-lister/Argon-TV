import { VIDEOS } from "./videos.js";
import { XORShift } from "random-seedable";

// 6:30pm, March 7th, 2026 (GMT)
const START_TIME = 1772908200000;
// 6 hours
const SCHEDULE_LENGTH = 1000 * 60 * 60 * 6;

const getScheduleItem = (random, schedule, largeItemProbability) => {
  const largeItem = random.randRange(0, 1) < largeItemProbability;

  if (largeItem) {
    //
  } else {
    //
  }
};

export const createSchedule = (currentTime) => {
  const random = new XORShift(123456789);

  const schedule = [];
  let timeUntilScheduleEnds = START_TIME - currentTime;

  while (timeUntilScheduleEnds < SCHEDULE_LENGTH) {
    const randomIndex = Math.floor(random.randRange(0, VIDEOS.length - 1));
    const video = VIDEOS[randomIndex];
    schedule.push({
      ...video,
      startTime: currentTime + timeUntilScheduleEnds,
    });
    timeUntilScheduleEnds += video.length * 1000;
  }

  return schedule;
};

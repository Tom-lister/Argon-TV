import { Video, Group, VIDEOS, Tag, Genre, Cast } from "./videos.js";
import { XORShift } from "random-seedable";

type ScheduleVideo = Video & {
  type: "video";
  startTime: number;
};

type ScheduleMarathon = {
  type: "marathon";
  title: string;
  attribute: Group | Tag | Cast;
  videos: ScheduleVideo[];
};

type ScheduleItem = ScheduleVideo | ScheduleMarathon;

// Midnight, March 8th, 2026 (GMT)
const START_TIME = 1772928000000;
// 6 hours
const SCHEDULE_LENGTH = 1000 * 60 * 60 * 24;

const LARGE_ITEM_PROBABILITIES = [0, 0.1, 0.25, 0.45, 0.7, 1];
const LONG_VIDEO_TIME = 60 * 26;

const formatTime = (utcMs: number): string => {
  const date = new Date(utcMs);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const flattenSchedule = (schedule: ScheduleItem[]): ScheduleVideo[] =>
  schedule.flatMap((item) => {
    if ("id" in item) {
      return [item];
    }
    return item.videos;
  });

const getWeightedVideoArray = (
  videos: Video[],
  schedule: ScheduleItem[],
): Video[] => {
  const flattenedSchedule = flattenSchedule(schedule);
  flattenedSchedule.reverse();

  const weightedVideoArray: Video[] = [];
  for (const video of videos) {
    const mostRecentIndex = flattenedSchedule.findIndex(
      (item) => item.id === video.id,
    );
    const videoFrequency =
      mostRecentIndex >= 0 ? mostRecentIndex : flattenedSchedule.length || 1;
    weightedVideoArray.push(...Array(videoFrequency).fill(video));
  }

  return weightedVideoArray;
};

const getWeightedAttributeArray = <T>(
  attributes: T[],
  schedule: ScheduleItem[],
): T[] => {
  const reversedSchedule = schedule.filter((item) => item.type === "marathon");
  reversedSchedule.reverse();

  const weightedAttributeArray: T[] = [];
  for (const attribute of attributes) {
    const mostRecentIndex = reversedSchedule.findIndex(
      (item) => item.attribute === attribute,
    );
    const attributeFrequency =
      mostRecentIndex >= 0 ? mostRecentIndex : reversedSchedule.length || 1;
    weightedAttributeArray.push(...Array(attributeFrequency).fill(attribute));
  }

  return weightedAttributeArray;
};

const createMarathon = (
  videos: ScheduleVideo[],
  attribute: Group | Tag | Cast,
): ScheduleMarathon => ({
  type: "marathon",
  title:
    videos.length == 2 ? `${attribute}: Back to Back` : `${attribute} Marathon`,
  attribute,
  videos,
});

// TODO - pause at midnight, resume at 8am
export const createSchedule = (currentTime: number): ScheduleItem[] => {
  const random = new XORShift(123456789);

  const schedule: ScheduleItem[] = [];
  let timeUntilScheduleEnds = START_TIME - currentTime;
  let largeItemProbabilityIndex = 0;

  const formatVideoForSchedule = (video: Video): ScheduleVideo => {
    const formattedVideo = {
      type: "video" as const,
      startTime: currentTime + timeUntilScheduleEnds,
      ...video,
    };
    timeUntilScheduleEnds += video.length * 1000;
    return formattedVideo;
  };

  while (timeUntilScheduleEnds < SCHEDULE_LENGTH) {
    const largeItem =
      random.float() < LARGE_ITEM_PROBABILITIES[largeItemProbabilityIndex];

    if (largeItem) {
      // Get marathon or long video

      largeItemProbabilityIndex = 0;

      const largeItemType = random.choice([
        "tagMarathon",
        "groupMarathon",
        "castMarathon",
        "longVideo",
        "longVideo",
      ]);

      switch (largeItemType) {
        case "castMarathon":
          const weightedCasts = getWeightedAttributeArray(
            Object.values(Cast),
            schedule,
          );
          const randomCast = random.choice(weightedCasts);
          const videosWithCast = VIDEOS.filter((video) =>
            video.cast?.includes(randomCast),
          );
          random.shuffle(videosWithCast);
          const randomCastVideos = videosWithCast.slice(0, 4);
          const castMarathonVideos = randomCastVideos.map(
            formatVideoForSchedule,
          );
          schedule.push(createMarathon(castMarathonVideos, randomCast));
          break;
        case "tagMarathon":
          const weightedTags = getWeightedAttributeArray(
            Object.values(Tag),
            schedule,
          );
          const randomTag = random.choice(weightedTags);
          const videosWithTag = VIDEOS.filter((video) =>
            video.tags?.includes(randomTag),
          );
          random.shuffle(videosWithTag);
          const randomTagVideos = videosWithTag.slice(0, 4);
          const tagMarathonVideos = randomTagVideos.map(formatVideoForSchedule);
          schedule.push(createMarathon(tagMarathonVideos, randomTag));
          break;
        case "groupMarathon":
          const weightedGroups = getWeightedAttributeArray(
            Object.values(Group),
            schedule,
          );
          const randomGroup = random.choice(weightedGroups);
          const videosWithGroup = VIDEOS.filter(
            (video) => video.group === randomGroup,
          );
          videosWithGroup.reverse();
          const groupMarathonVideos = videosWithGroup.map(
            formatVideoForSchedule,
          );
          schedule.push(createMarathon(groupMarathonVideos, randomGroup));
          break;
        case "longVideo":
          const longVideos = VIDEOS.filter(
            (video) => video.length >= LONG_VIDEO_TIME,
          );
          const weightedLongVideos = getWeightedVideoArray(
            longVideos,
            schedule,
          );
          const randomLongVideo = random.choice(weightedLongVideos);
          schedule.push(formatVideoForSchedule(randomLongVideo));
          break;
      }
    } else {
      // Get single video

      largeItemProbabilityIndex++;

      const filteredVideos = VIDEOS.filter(
        (video) =>
          video.genre !== Genre.Update && video.length < LONG_VIDEO_TIME,
      );

      const weightedVideos = getWeightedVideoArray(filteredVideos, schedule);

      const randomVideo = random.choice(weightedVideos);
      schedule.push(formatVideoForSchedule(randomVideo));
    }
  }

  return schedule;
};

// TODO - display from start of current day
export const displaySchedule = (schedule: ScheduleItem[]) => {
  const scheduleContainer = document.getElementById("schedule-container")!;
  const todayTable = document.createElement("table");
  schedule.forEach((item) => {
    const row = document.createElement("tr");
    if (item.type === "video") {
      const timeCell = document.createElement("td");
      timeCell.textContent = formatTime(item.startTime);
      row.appendChild(timeCell);

      const titleCell = document.createElement("td");
      titleCell.textContent = item.title;
      row.appendChild(titleCell);

      if (item.genre === Genre.Special || item.length >= LONG_VIDEO_TIME) {
        row.classList.add("large-video");
      }
      if (item.genre === Genre.Trailer) {
        row.classList.add("trailer");
      }
    } else {
      const marathonCell = document.createElement("td");
      marathonCell.setAttribute("colspan", "2");

      const marathonBox = document.createElement("div");
      marathonBox.classList.add("marathon-box");

      const marathonTitle = document.createElement("p");
      marathonTitle.textContent = item.title;
      marathonBox.appendChild(marathonTitle);

      const marathonTable = document.createElement("table");
      item.videos.forEach((video) => {
        const videoRow = document.createElement("tr");

        const videoTimeCell = document.createElement("td");
        videoTimeCell.textContent = formatTime(video.startTime);
        videoRow.appendChild(videoTimeCell);

        const videoTitleCell = document.createElement("td");
        videoTitleCell.textContent = video.title;
        videoRow.appendChild(videoTitleCell);

        marathonTable.appendChild(videoRow);
      });
      marathonBox.appendChild(marathonTable);

      marathonCell.appendChild(marathonBox);
      row.appendChild(marathonCell);
    }
    todayTable.appendChild(row);
  });
  scheduleContainer.appendChild(todayTable);
};

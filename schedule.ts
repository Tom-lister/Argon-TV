import { Video, VideoGroup, VIDEOS, VideoTag, VideoGenre } from "./videos.js";
import { XORShift } from "random-seedable";

type ScheduleVideo = Video & {
  type: "video";
  startTime: number;
};

type ScheduleMarathon = {
  type: "marathon";
  title: string;
  videos: ScheduleVideo[];
};

type ScheduleItem = ScheduleVideo | ScheduleMarathon;

// 8:30pm, March 7th, 2026 (GMT)
const START_TIME = 1772922600000;
// 6 hours
const SCHEDULE_LENGTH = 1000 * 60 * 60 * 6;

const LARGE_ITEM_PROBABILITIES = [0, 0.1, 0.25, 0.45, 0.7, 1];

const formatTime = (utcMs: number): string => {
  const date = new Date(utcMs);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const createMarathon = (
  videos: ScheduleVideo[],
  title: string,
): ScheduleMarathon => ({
  type: "marathon",
  title: videos.length == 2 ? `${title}: Back to Back` : `${title} Marathon`,
  videos,
});

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
        //"castMarathon",
        "longVideo",
      ]);

      switch (largeItemType) {
        case "tagMarathon":
          const randomTag = random.choice(Object.values(VideoTag));
          const videosWithTag = VIDEOS.filter((video) =>
            video.tags?.includes(randomTag),
          );
          random.shuffle(videosWithTag);
          const randomVideos = videosWithTag.slice(0, 4);
          const tagMarathonVideos = randomVideos.map(formatVideoForSchedule);
          schedule.push(createMarathon(tagMarathonVideos, randomTag));
          break;
        case "groupMarathon":
          const randomGroup = random.choice(Object.values(VideoGroup));
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
          const longVideos = VIDEOS.filter((video) => video.length >= 60 * 30);
          const randomLongVideo = random.choice(longVideos);
          schedule.push(formatVideoForSchedule(randomLongVideo));
          break;
      }
    } else {
      // Get single video

      largeItemProbabilityIndex++;

      const filteredVideos = VIDEOS.filter(
        (video) => video.genre !== VideoGenre.Update && video.length < 60 * 30,
      );

      const randomVideo = random.choice(filteredVideos);
      schedule.push(formatVideoForSchedule(randomVideo));
    }
  }

  return schedule;
};

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

      if (item.genre === VideoGenre.Special || item.length >= 60 * 30) {
        row.classList.add("large-video");
      }
      if (item.genre === VideoGenre.Trailer) {
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

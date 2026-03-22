import { XORShift } from "random-seedable";
import {
  DAILY_RUNTIME,
  LARGE_ITEM_PROBABILITIES,
  LONG_VIDEO_TIME,
  SCHEDULE_START_TIME,
  SEED,
} from "./constants.js";
import {
  Cast,
  Genre,
  Group,
  Ident,
  IDENTS,
  Tag,
  Video,
  VIDEOS,
} from "./database.js";
import {
  flattenProgramming,
  flattenSchedule,
  formatTime,
  getEightAmDate,
} from "./utils.js";

export type Marathon = {
  type: "marathon";
  title: string;
  attribute: Group | Tag | Cast;
  videos: Video[];
};

export type ProgrammingItem = Video | Marathon;

export type ScheduleVideo = Video & {
  startTime: number;
};

export type ScheduleMarathon = Omit<Marathon, "videos"> & {
  videos: (ScheduleVideo | ScheduleIdent)[];
};

export type ScheduleIdent = Ident & {
  startTime: number;
};

export type ScheduleItem = ScheduleVideo | ScheduleMarathon | ScheduleIdent;

/////////////////////////////// GENERATION ///////////////////////////////

const getAvailableVideos = (dayStartTime: number): Video[] => {
  const currentTime = new Date(dayStartTime);
  const startOfDay = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate(),
  );

  return VIDEOS.filter((video) => video.genre !== Genre.Update)
    .filter(
      (video) =>
        !video.enterRotation || video.enterRotation <= startOfDay.getTime(),
    )
    .filter(
      (video) =>
        !video.exitRotation || video.exitRotation > startOfDay.getTime(),
    );
};

const getAvailableIdents = (dayStartTime: number): Ident[] => {
  const currentTime = new Date(dayStartTime);
  const startOfDay = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate(),
  );

  return IDENTS.filter(
    (ident) =>
      !ident.enterRotation || ident.enterRotation <= startOfDay.getTime(),
  ).filter(
    (ident) => !ident.exitRotation || ident.exitRotation > startOfDay.getTime(),
  );
};

const getWeightedVideoArray = (
  videos: Video[],
  programming: ProgrammingItem[],
): Video[] => {
  const flattenedProgramming = flattenProgramming(programming);
  flattenedProgramming.reverse();

  const weightedVideoArray: Video[] = [];
  for (const video of videos) {
    const mostRecentIndex = flattenedProgramming.findIndex(
      (item) => item.id === video.id,
    );
    const videoFrequency =
      mostRecentIndex >= 0 ? mostRecentIndex : flattenedProgramming.length || 1;
    weightedVideoArray.push(...Array(videoFrequency).fill(video));
  }

  return weightedVideoArray;
};

const getValidIdents = (
  availableIdents: Ident[],
  programming: ProgrammingItem[],
  index: number,
): Ident[] => {
  const upcomingProgramming = programming.slice(index + 1);

  const flattenedUpcomingProgramming = flattenProgramming(upcomingProgramming);

  const nonPromotionalIdents = availableIdents.filter(
    (ident) => !ident.promote,
  );
  const promotionalIdents = availableIdents.filter(
    (ident) =>
      ident.promote &&
      flattenedUpcomingProgramming.some(
        (item) => item.id === ident.promote?.id,
      ),
  );

  const neighbouringVideos: Video[] = [];

  const lastItem = index > 0 ? programming[index - 1] : undefined;
  if (lastItem?.type === "video") {
    neighbouringVideos.push(lastItem);
  } else if (lastItem?.type === "marathon") {
    neighbouringVideos.push(...lastItem.videos);
  }

  const nextItem = programming[index];
  if (nextItem?.type === "video") {
    neighbouringVideos.push(nextItem);
  } else if (nextItem?.type === "marathon") {
    neighbouringVideos.push(...nextItem.videos);
  }

  const validIdents = [...nonPromotionalIdents, ...promotionalIdents].filter(
    (ident) =>
      !neighbouringVideos.some(
        (video) =>
          ident.avoid?.includes(video.id) ||
          // Don't promote if it's up next
          ident.promote?.id === video.id,
      ),
  );

  return validIdents;
};

const getWeightedIdentArray = (
  idents: Ident[],
  identsSoFar: Ident[],
): Ident[] => {
  const reversedIdents = [...identsSoFar];
  reversedIdents.reverse();

  const weightedIdentArray: Ident[] = [];
  for (const ident of idents) {
    const mostRecentIndex = reversedIdents.findIndex(
      (item) => item.id === ident.id,
    );
    const identFrequency =
      mostRecentIndex >= 0 ? mostRecentIndex : reversedIdents.length || 1;
    weightedIdentArray.push(...Array(identFrequency).fill(ident));
  }

  return weightedIdentArray;
};

const getWeightedAttributeArray = <T>(
  attributes: T[],
  programming: ProgrammingItem[],
): T[] => {
  const reversedProgramming = programming.filter(
    (item) => item.type === "marathon",
  );
  reversedProgramming.reverse();

  const weightedAttributeArray: T[] = [];
  for (const attribute of attributes) {
    const mostRecentIndex = reversedProgramming.findIndex(
      (item) => item.attribute === attribute,
    );
    const attributeFrequency =
      mostRecentIndex > 0 ? mostRecentIndex : reversedProgramming.length || 1;
    weightedAttributeArray.push(...Array(attributeFrequency).fill(attribute));
  }

  return weightedAttributeArray;
};

const chooseMultiple = (videos: Video[], random: XORShift): Video[] => {
  const shuffledVideos = random.shuffle(videos);
  const returnVideos: Video[] = [];
  while (returnVideos.length < 4 && shuffledVideos.length > 0) {
    const randomVideo = shuffledVideos.pop();
    if (!returnVideos.some((video) => video.id === randomVideo.id)) {
      returnVideos.push(randomVideo);
    }
  }
  return returnVideos;
};

const createMarathon = (
  videos: Video[],
  attribute: Group | Tag | Cast,
): Marathon => ({
  type: "marathon",
  title:
    videos.length == 2 ? `${attribute}: Back to Back` : `${attribute} Marathon`,
  attribute,
  videos,
});

const estimateTotalProgrammingRuntime = (
  programming: ProgrammingItem[],
): number => {
  const averageIdentLength =
    IDENTS.reduce((acc, ident) => acc + ident.length * 1000, 0) / IDENTS.length;
  return programming.reduce((acc, item) => {
    if ("videos" in item) {
      return (
        acc +
        item.videos.reduce(
          (videoAcc, video) =>
            videoAcc +
            (video.endTime ?? video.length) * 1000 +
            averageIdentLength,
          0,
        )
      );
    }
    return acc + (item.endTime ?? item.length) * 1000 + averageIdentLength;
  }, -averageIdentLength);
};

const convertProgrammingToSchedule = (
  random: XORShift,
  dayStartTime: number,
  programming: ProgrammingItem[],
  pastIdents: Ident[],
): ScheduleItem[] => {
  let elapsedTime = 0;
  let index = 0;

  const dailySchedule: ScheduleItem[] = [];
  const identsSoFar = [...pastIdents];

  const availableIdents = getAvailableIdents(dayStartTime);

  const addIdent = (schedule: ScheduleItem[]) => {
    const validIdents = getValidIdents(availableIdents, programming, index);
    if (validIdents.length) {
      const weightedIdents = getWeightedIdentArray(validIdents, identsSoFar);
      const randomIdent = random.choice(weightedIdents);
      identsSoFar.push(randomIdent);
      schedule.push({
        ...randomIdent,
        startTime: dayStartTime + elapsedTime,
      });
      elapsedTime += randomIdent.length * 1000;
    }
  };

  while (index < programming.length) {
    const item = programming[index];

    let needsIndent = index > 0;

    if (item.type === "video") {
      if (needsIndent) addIdent(dailySchedule);

      dailySchedule.push({
        ...item,
        startTime: dayStartTime + elapsedTime,
      });
      elapsedTime += (item.endTime ?? item.length) * 1000;
    } else {
      const marathonItems: (ScheduleVideo | ScheduleIdent)[] = [];

      for (const video of item.videos) {
        if (needsIndent) {
          addIdent(marathonItems);
        }
        needsIndent = true;

        marathonItems.push({
          ...video,
          startTime: dayStartTime + elapsedTime,
        });
        elapsedTime += (video.endTime ?? video.length) * 1000;
      }

      dailySchedule.push({
        ...item,
        videos: marathonItems,
      });
    }
    index++;
  }

  return dailySchedule;
};

const createDailyProgramming = (
  random: XORShift,
  availableVideos: Video[],
  pastProgramming: ProgrammingItem[],
): ProgrammingItem[] => {
  const programming: ProgrammingItem[] = [];
  let largeItemProbabilityIndex = 0;
  while (estimateTotalProgrammingRuntime(programming) < DAILY_RUNTIME) {
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
      ]);

      switch (largeItemType) {
        case "castMarathon":
          const weightedCasts = getWeightedAttributeArray(Object.values(Cast), [
            ...pastProgramming,
            ...programming,
          ]);
          const randomCast = random.choice(weightedCasts);
          const videosWithCast = availableVideos.filter((video) =>
            video.cast?.includes(randomCast),
          );
          const weightedCastVideos = getWeightedVideoArray(videosWithCast, [
            ...pastProgramming,
            ...programming,
          ]);
          const randomCastVideos = chooseMultiple(weightedCastVideos, random);
          programming.push(createMarathon(randomCastVideos, randomCast));
          break;
        case "tagMarathon":
          const weightedTags = getWeightedAttributeArray(Object.values(Tag), [
            ...pastProgramming,
            ...programming,
          ]);
          const randomTag = random.choice(weightedTags);
          const videosWithTag = availableVideos.filter((video) =>
            video.tags?.includes(randomTag),
          );
          const weightedTagVideos = getWeightedVideoArray(videosWithTag, [
            ...pastProgramming,
            ...programming,
          ]);
          const randomTagVideos = chooseMultiple(weightedTagVideos, random);
          programming.push(createMarathon(randomTagVideos, randomTag));
          break;
        case "groupMarathon":
          const weightedGroups = getWeightedAttributeArray(
            Object.values(Group),
            [...pastProgramming, ...programming],
          );
          const randomGroup = random.choice(weightedGroups);
          const videosWithGroup = availableVideos.filter(
            (video) => video.group === randomGroup,
          );
          videosWithGroup.reverse();
          programming.push(createMarathon(videosWithGroup, randomGroup));
          break;
        case "longVideo":
          const longVideos = availableVideos.filter(
            (video) => video.length >= LONG_VIDEO_TIME,
          );
          const weightedLongVideos = getWeightedVideoArray(longVideos, [
            ...pastProgramming,
            ...programming,
          ]);
          const randomLongVideo = random.choice(weightedLongVideos);
          programming.push(randomLongVideo);
          break;
      }
    } else {
      // Get short video

      largeItemProbabilityIndex++;

      const filteredVideos = availableVideos.filter(
        (video) => video.length < LONG_VIDEO_TIME,
      );

      const weightedVideos = getWeightedVideoArray(filteredVideos, [
        ...pastProgramming,
        ...programming,
      ]);

      const randomVideo = random.choice(weightedVideos);
      programming.push(randomVideo);
    }
  }

  return programming;
};

export const createSchedule = (
  random: XORShift,
  loadTime: number,
): ScheduleItem[] => {
  const daysSinceScheduleStart = Math.ceil(
    (loadTime - SCHEDULE_START_TIME) / (1000 * 60 * 60 * 24),
  );

  const daysToCreate = daysSinceScheduleStart + 3;

  const fullSchedule: ScheduleItem[] = [];
  const pastProgramming: ProgrammingItem[] = [];

  for (let i = 0; i < daysToCreate; i++) {
    const dayStartTime = SCHEDULE_START_TIME + i * 1000 * 60 * 60 * 24;

    const availableVideos = getAvailableVideos(dayStartTime);

    const programming = createDailyProgramming(
      random,
      availableVideos,
      pastProgramming,
    );

    const pastIdents = flattenSchedule(fullSchedule).filter(
      (item) => item.type === "ident",
    );

    const schedule = convertProgrammingToSchedule(
      random,
      dayStartTime,
      programming,
      pastIdents,
    );

    fullSchedule.push(...schedule);
    pastProgramming.push(...programming);
  }

  return fullSchedule;
};

/////////////////////////////// DISPLAY ///////////////////////////////

const displayDailySchedule = (schedule: ScheduleItem[], table: HTMLElement) => {
  schedule.forEach((item) => {
    if (item.type === "ident") return;

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
        if (video.type === "ident") return;

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
    table.appendChild(row);
  });
};

export const displaySchedule = (schedule: ScheduleItem[], loadTime: number) => {
  const todayTable = document.getElementById("today-schedule")!;

  const now = new Date(loadTime);
  const eightAmToday = getEightAmDate(now).getTime();
  const eightAmNextMorning = getEightAmDate(now, 1).getTime();
  const eightAmNextDay = getEightAmDate(now, 2).getTime();

  const todaySchedule = schedule.filter((item) =>
    item.type === "marathon"
      ? item.videos.some(
          (video) =>
            video.startTime >= eightAmToday &&
            video.startTime < eightAmNextMorning,
        )
      : item.startTime >= eightAmToday && item.startTime < eightAmNextMorning,
  );

  displayDailySchedule(todaySchedule, todayTable);

  const tomorrowTable = document.getElementById("tomorrow-schedule")!;

  const tomorrowSchedule = schedule.filter((item) =>
    item.type === "marathon"
      ? item.videos.some(
          (video) =>
            video.startTime >= eightAmNextMorning &&
            video.startTime < eightAmNextDay,
        )
      : item.startTime >= eightAmNextMorning && item.startTime < eightAmNextDay,
  );

  displayDailySchedule(tomorrowSchedule, tomorrowTable);
};

import { LONG_VIDEO_TIME, OFF_AIR_VIDEO_ID } from "./constants.js";
import {
  createSchedule,
  displaySchedule,
  flattenSchedule,
  ScheduleVideo,
} from "./schedule.js";
import { formatTime, getEightAmDate, isFirstForDay } from "./utils.js";
import { Genre } from "./database.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

const startTime = Date.now();

const schedule = createSchedule(startTime);

const flattenedSchedule = flattenSchedule(schedule);

let currentVideoIndex = 0;
while (startTime > flattenedSchedule[currentVideoIndex + 1].startTime) {
  currentVideoIndex++;
}

const firstVideoStartTime =
  startTime - flattenedSchedule[currentVideoIndex].startTime;

displaySchedule(schedule);

/////////////////////////////// ADVERT ///////////////////////////////

type AdvertData = {
  header: string;
  title: string;
  time: string;
};

const getAdvertData = (upcomingVideos: ScheduleVideo[]) => {
  const nextVideo = upcomingVideos[0];
  const nonImmediateVideos = upcomingVideos.slice(1);

  const promoteSpecial =
    nonImmediateVideos.some((video) => video.genre === Genre.Special) &&
    Math.random() < 0.5;

  const videoToUse = promoteSpecial
    ? nonImmediateVideos.find((video) => video.genre === Genre.Special)!
    : nextVideo;

  const advertHeader = promoteSpecial ? "DON'T MISS" : "UP NEXT";

  return {
    header: advertHeader,
    title: videoToUse.title,
    time: formatTime(videoToUse.startTime),
  };
};

const prepareAdverts = (videoProgress: number = 0) => {
  const video = flattenedSchedule[currentVideoIndex];

  const upcomingVideos: ScheduleVideo[] = [];
  for (let i = 1; i <= 4; i++) {
    const upcomingVideo = flattenedSchedule[currentVideoIndex + i];
    if (isFirstForDay(upcomingVideo)) break;
    upcomingVideos.push(upcomingVideo);
  }

  if (
    upcomingVideos.length > 0 &&
    video.genre !== Genre.Trailer &&
    video.length >= 45
  ) {
    if (video.length >= LONG_VIDEO_TIME) {
      const advertProps1 = getAdvertData(upcomingVideos);
      const advertProps2 = getAdvertData(upcomingVideos);

      const halfwayThroughVideo = video.length / 2;

      const advertTimestamp1 = (3 * halfwayThroughVideo) / 4;
      const advertTimestamp2 = halfwayThroughVideo + advertTimestamp1;

      const advertWait1 = advertTimestamp1 - videoProgress;
      const advertWait2 = advertTimestamp2 - videoProgress;

      if (advertWait1 > 0) {
        setTimeout(() => showAdvert(advertProps1), advertWait1 * 1000);
      }
      if (advertWait2 > 0) {
        setTimeout(() => showAdvert(advertProps2), advertWait2 * 1000);
      }
    } else {
      const advertProps = getAdvertData(upcomingVideos);

      const advertTimestamp = (3 * video.length) / 4;
      const advertWait = advertTimestamp - videoProgress;

      if (advertWait > 0) {
        setTimeout(() => showAdvert(advertProps), advertWait * 1000);
      }
    }
  }
};

const showAdvert = ({ header, title, time }: AdvertData) => {
  const advertContainer = document.getElementById("banner-container")!;
  const banner = document.createElement("div");
  banner.id = "banner";

  const advertBody = document.createElement("div");
  advertBody.id = "banner-body";

  const advertHeader = document.createElement("p");
  advertHeader.classList.add("banner-header");
  advertHeader.textContent = header;
  advertBody.appendChild(advertHeader);

  const advertText = document.createElement("p");
  advertText.classList.add("banner-text");
  const timeSpan = document.createElement("span");
  timeSpan.className = "banner-time";
  timeSpan.textContent = time;
  advertText.appendChild(timeSpan);
  advertText.appendChild(document.createTextNode(` ${title}`));
  if (title.length >= 50) {
    advertText.style.fontSize = "20px";
  }
  advertBody.appendChild(advertText);

  banner.appendChild(advertBody);

  for (let i = 0; i < 3; i++) {
    const advertDiv = document.createElement("div");
    banner.appendChild(advertDiv);
  }

  advertContainer.appendChild(banner);

  // Start animation
  void banner.offsetHeight;

  banner.style.opacity = "1";
  banner.style.marginBottom = "2%";
  advertBody.style.flex = "10";
  advertBody.style.paddingLeft = "24px";
  advertBody.style.opacity = "1";

  setTimeout(hideAdvert, 6500);
};

const hideAdvert = () => {
  const banner = document.getElementById("banner")!;
  banner.style.opacity = "0";
  banner.style.marginBottom = "0%";
  setTimeout(deleteAdvert, 1000);
};

const deleteAdvert = () => {
  const banner = document.getElementById("banner")!;
  banner.remove();
};

/////////////////////////////// VIDEO PLAYER ///////////////////////////////

const currentVideoTitle = document.getElementById("current-video-title")!;

let player: YT.Player | undefined;
let onAir = true;

function nextVideo(): void {
  currentVideoIndex++;
  const video = flattenedSchedule[currentVideoIndex];

  if (player) {
    player.loadVideoById(video.id, 0, "hd1080");
    player.unMute();
    currentVideoTitle.textContent = video.title;

    prepareAdverts();
  }
}

function offAirVideo(): void {
  if (player) {
    player.loadVideoById(OFF_AIR_VIDEO_ID, 0, "hd1080");
    player.unMute();
    player.setLoop(true);
    currentVideoTitle.textContent = "---";
  }

  // TODO - find way to switch back
}

function stillBroadcasting(): boolean {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  if (currentHour >= 0 && currentHour < 8) {
    const nextVideoTime = flattenedSchedule[currentVideoIndex + 1].startTime;
    const eightAmToday = getEightAmDate(currentTime).getTime();
    if (nextVideoTime === eightAmToday) {
      return false;
    }
  }
  return true;
}

function initPlayer(): void {
  const videoProgress = Math.floor(firstVideoStartTime / 1000);

  onAir = stillBroadcasting();
  // TODO - find way to switch back

  player = new YT.Player("yt-player", {
    videoId: onAir ? flattenedSchedule[currentVideoIndex].id : OFF_AIR_VIDEO_ID,
    playerVars: {
      autoplay: 1,
      loop: onAir ? 0 : 1,
      mute: 1,
      controls: 0,
      showinfo: 0,
      rel: 0,
      // TODO - consistent progress through off-air video
      start: onAir ? videoProgress : 0,
    },
    events: {
      onReady(event: YT.PlayerEvent) {
        event.target.setPlaybackQuality("hd1080");
      },
      onStateChange(event: YT.OnStateChangeEvent) {
        if (event.data === YT.PlayerState.ENDED) {
          // Check if we've stopped broadcasting for the day
          onAir = stillBroadcasting();

          if (onAir) {
            nextVideo();
          } else {
            offAirVideo();
          }
        }
      },
    },
  });

  if (onAir) {
    currentVideoTitle.textContent = flattenedSchedule[currentVideoIndex].title;
    prepareAdverts(videoProgress);
  } else {
    currentVideoTitle.textContent = "---";
  }
}

function onYouTubeIframeAPIReady(): void {
  initPlayer();
}

// Expose for YouTube API callback
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// If the API already loaded before this script ran (e.g. on reload), create the player now.
if (typeof YT !== "undefined" && (YT as { loaded?: boolean }).loaded) {
  initPlayer();
}

/////////////////////////////// SPLASH SCREEN ///////////////////////////////

document.getElementById("start-btn")!.addEventListener("click", () => {
  if (player && player.unMute) {
    const splashScreen = document.getElementById("splash-screen")!;
    splashScreen.style.visibility = "hidden";
    splashScreen.style.opacity = "0";
    player.unMute();
  }
});

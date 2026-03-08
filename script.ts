import { LONG_VIDEO_TIME } from "./constants.js";
import {
  createSchedule,
  displaySchedule,
  flattenSchedule,
  ScheduleVideo,
} from "./schedule.js";
import { formatTime, getEightAmDate, isFirstForDay } from "./utils.js";
import { Genre, Video } from "./videos.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

let startTime = Date.now();

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

  const timeLeftInVideo = video.length - videoProgress;

  if (
    upcomingVideos.length > 0 &&
    video.genre !== Genre.Trailer &&
    timeLeftInVideo >= 45
  ) {
    if (timeLeftInVideo >= LONG_VIDEO_TIME) {
      const advertProps1 = getAdvertData(upcomingVideos);
      const advertProps2 = getAdvertData(upcomingVideos);

      const halfwayThroughVideo = timeLeftInVideo / 2;

      const minAdvertWait1 = 20;
      const maxAdvertWait1 = halfwayThroughVideo - 20;
      const advertWait1 =
        minAdvertWait1 + Math.random() * (maxAdvertWait1 - minAdvertWait1);

      const minAdvertWait2 = halfwayThroughVideo + 20;
      const maxAdvertWait2 = timeLeftInVideo - 20;
      const advertWait2 =
        minAdvertWait2 + Math.random() * (maxAdvertWait2 - minAdvertWait2);

      setTimeout(() => showAdvert(advertProps1), advertWait1 * 1000);
      setTimeout(() => showAdvert(advertProps2), advertWait2 * 1000);
    } else {
      const advertProps = getAdvertData(upcomingVideos);

      const minAdvertWait = 20;
      const maxAdvertWait = timeLeftInVideo - 20;
      const advertWait =
        minAdvertWait + Math.random() * (maxAdvertWait - minAdvertWait);

      setTimeout(() => showAdvert(advertProps), advertWait * 1000);
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

  if (player && player.loadVideoById) {
    player.loadVideoById(video.id, 0, "highres");
    player.unMute();
    currentVideoTitle.textContent = video.title;

    prepareAdverts();
  }
}

function offAirVideo(): void {
  // TODO
}

function initPlayer(): void {
  const videoProgress = Math.floor(firstVideoStartTime / 1000);

  player = new YT.Player("yt-player", {
    videoId: flattenedSchedule[currentVideoIndex].id,
    playerVars: {
      autoplay: 1,
      loop: 0,
      mute: 1,
      controls: 0,
      showinfo: 0,
      rel: 0,
      start: videoProgress,
    },
    events: {
      onReady(event: YT.PlayerEvent) {
        event.target.setPlaybackQuality("highres");
      },
      onStateChange(event: YT.OnStateChangeEvent) {
        if (event.data === YT.PlayerState.ENDED) {
          // Check if we've stopped broadcasting for the day
          const currentTime = new Date();
          const currentHour = currentTime.getHours();
          if (currentHour >= 0 && currentHour < 8) {
            const nextVideoTime =
              flattenedSchedule[currentVideoIndex + 1].startTime;
            const eightAmToday = getEightAmDate(currentTime).getTime();
            if (nextVideoTime === eightAmToday) {
              onAir = false;
            }
          }

          if (onAir) {
            nextVideo();
          } else {
            offAirVideo();
          }
        }
      },
    },
  });
  currentVideoTitle.textContent = flattenedSchedule[currentVideoIndex].title;
  prepareAdverts(videoProgress);
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

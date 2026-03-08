import {
  createSchedule,
  displaySchedule,
  flattenSchedule,
} from "./schedule.js";
import { getEightAmDate } from "./utils.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

let timeWhenLoaded = Date.now();

const schedule = createSchedule(timeWhenLoaded);

const flattenedSchedule = flattenSchedule(schedule);

let currentVideoIndex = 0;
while (timeWhenLoaded > flattenedSchedule[currentVideoIndex + 1].startTime) {
  currentVideoIndex++;
}

const firstVideoStartTime =
  timeWhenLoaded - flattenedSchedule[currentVideoIndex].startTime;

displaySchedule(schedule);

/////////////////////////////// VIDEO PLAYER ///////////////////////////////

const currentVideoTitle = document.getElementById("current-video-title")!;

let player: YT.Player | undefined;
let onAir = true;

function switchToVideo(videoId: string): void {
  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    player.unMute();
    currentVideoTitle.textContent = flattenedSchedule[currentVideoIndex].title;
  }
}

function nextVideo(): void {
  currentVideoIndex++;
  switchToVideo(flattenedSchedule[currentVideoIndex].id);
}

function offAirVideo(): void {
  // TODO
}

// TODO - ensure always highest resolution
function initPlayer(): void {
  player = new YT.Player("yt-player", {
    videoId: flattenedSchedule[currentVideoIndex].id,
    playerVars: {
      autoplay: 1,
      loop: 0,
      mute: 1,
      controls: 0,
      showinfo: 0,
      rel: 0,
      start: Math.floor(firstVideoStartTime / 1000),
    },
    events: {
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

document.getElementById("start-btn")!.addEventListener("click", () => {
  if (player && player.unMute) {
    const splashScreen = document.getElementById("splash-screen")!;
    splashScreen.style.visibility = "hidden";
    splashScreen.style.opacity = "0";
    player.unMute();
  }
});

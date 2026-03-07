import { createSchedule, displaySchedule } from "./schedule.js";
import { VideoGenre } from "./videos.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

let currentTime = Date.now();

const schedule = createSchedule(currentTime);

const flattenedSchedule = schedule.flatMap((item) => {
  if ("id" in item) {
    return [item];
  }
  return item.videos;
});

let currentVideoIndex = 0;
while (currentTime > flattenedSchedule[currentVideoIndex + 1].startTime) {
  currentVideoIndex++;
}

const firstVideoStartTime =
  currentTime - flattenedSchedule[currentVideoIndex].startTime;

displaySchedule(schedule);

/////////////////////////////// VIDEO PLAYER ///////////////////////////////

let player: YT.Player | undefined;

function nextVideo(): void {
  currentVideoIndex = (currentVideoIndex + 1) % flattenedSchedule.length;
  switchToVideo(flattenedSchedule[currentVideoIndex].id);
}

function switchToVideo(videoId: string): void {
  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    player.unMute();
  }
}

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
          nextVideo();
        }
      },
    },
  });
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

document.getElementById("unmute-btn")!.addEventListener("click", () => {
  if (player && player.unMute) {
    player.unMute();
  }
});

import { createSchedule } from "./schedule.js";
import { VideoType } from "./videos.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

let currentTime = Date.now();

const formatTime = (utcMs: number): string => {
  const d = new Date(utcMs);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day}/${year} ${hours}:${minutes}`;
};

const schedule = createSchedule(currentTime);

console.log(
  schedule.map((scheduleItem) => {
    if ("id" in scheduleItem) {
      return {
        ...scheduleItem,
        startTime: formatTime(scheduleItem.startTime),
      };
    }
    return {
      ...scheduleItem,
      videos: scheduleItem.videos.map((video) => ({
        ...video,
        startTime: formatTime(video.startTime),
      })),
    };
  }),
);

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

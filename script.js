import { createSchedule } from "./schedule.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

let currentTime = Date.now();

const formatTime = (utcMs) => {
  const d = new Date(utcMs);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${month}/${day}/${year} ${hours}:${minutes}`;
};

const SCHEDULE = createSchedule(currentTime);

console.log(
  SCHEDULE.map((video) => ({
    ...video,
    startTime: formatTime(video.startTime),
  })),
);

let currentVideoIndex = 0;
while (currentTime > SCHEDULE[currentVideoIndex + 1].startTime) {
  currentVideoIndex++;
}

const firstVideoStartTime = currentTime - SCHEDULE[currentVideoIndex].startTime;

/////////////////////////////// VIDEO PLAYER ///////////////////////////////

let player;

function nextVideo() {
  currentVideoIndex = (currentVideoIndex + 1) % SCHEDULE.length;
  switchToVideo(SCHEDULE[currentVideoIndex].id);
}

function switchToVideo(videoId) {
  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    player.unMute();
  }
}

function initPlayer() {
  player = new YT.Player("yt-player", {
    videoId: SCHEDULE[currentVideoIndex].id,
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
      onStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
          nextVideo();
        }
      },
    },
  });
}

function onYouTubeIframeAPIReady() {
  initPlayer();
}

// If the API already loaded before this script ran (e.g. on reload), create the player now.
if (typeof YT !== "undefined" && YT.loaded) {
  initPlayer();
}

document.getElementById("unmute-btn").addEventListener("click", () => {
  if (player && player.unMute) {
    player.unMute();
  }
});

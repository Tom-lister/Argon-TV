import { XORShift } from "random-seedable";
import { VIDEOS } from "./videos.js";

/////////////////////////////// SCHEDULE ///////////////////////////////

const random = new XORShift(123456789);

// 6:30pm, March 7th, 2026 (GMT)
const START_TIME = 1772908200000;
// 1 hour
const SCHEDULE_LENGTH = 1000 * 60 * 60;

const SCHEDULE = [];
let currentTime = Date.now();
let timeUntilScheduleEnds = START_TIME - currentTime;

const formatTime = (utcMs) => {
  const d = new Date(utcMs);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${month}/${day}/${year} ${hours}:${minutes}`;
};

while (timeUntilScheduleEnds < SCHEDULE_LENGTH) {
  const randomIndex = Math.floor(random.randRange(0, VIDEOS.length - 1));
  const video = VIDEOS[randomIndex];
  SCHEDULE.push({
    ...video,
    startTime: currentTime + timeUntilScheduleEnds,
  });
  timeUntilScheduleEnds += video.length * 1000;
}

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

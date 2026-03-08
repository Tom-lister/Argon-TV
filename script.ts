import {
  createSchedule,
  displaySchedule,
  flattenSchedule,
} from "./schedule.js";
import { formatTime, getEightAmDate } from "./utils.js";
import { Genre } from "./videos.js";

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

const prepareAdvert = (videoProgress: number = 0) => {
  const video = flattenedSchedule[currentVideoIndex];

  const timeLeftInVideo = video.length - videoProgress;

  if (video.genre !== Genre.Trailer && timeLeftInVideo >= 60) {
    const nextVideo = flattenedSchedule[currentVideoIndex + 1];

    const minAdvertTime = 20;
    const maxAdvertTime = timeLeftInVideo - minAdvertTime;
    const advertTime =
      minAdvertTime + Math.random() * (maxAdvertTime - minAdvertTime);

    console.log(advertTime);

    setTimeout(() => {
      showAdvert("UP NEXT", nextVideo.title, formatTime(nextVideo.startTime));
    }, advertTime * 1000);
  }
};

const showAdvert = (header: string, title: string, time: string) => {
  const advertContainer = document.getElementById("advert-container")!;
  const advert = document.createElement("div");
  advert.id = "advert";

  const advertBody = document.createElement("div");
  advertBody.id = "advert-body";

  const advertHeader = document.createElement("p");
  advertHeader.classList.add("advert-header");
  advertHeader.textContent = header;
  advertBody.appendChild(advertHeader);

  const advertText = document.createElement("p");
  advertText.classList.add("advert-text");
  advertText.innerHTML = `
    <span class="advert-time">${time}</span> ${title}
  `;
  advertBody.appendChild(advertText);

  advert.appendChild(advertBody);

  for (let i = 0; i < 3; i++) {
    const advertDiv = document.createElement("div");
    advert.appendChild(advertDiv);
  }

  advertContainer.appendChild(advert);

  // Start animation
  void advert.offsetHeight;

  advert.style.opacity = "1";
  advert.style.marginBottom = "2%";
  advertBody.style.flex = "10";
  advertBody.style.paddingLeft = "24px";
  advertBody.style.opacity = "1";

  setTimeout(hideAdvert, 6500);
};

const hideAdvert = () => {
  const advert = document.getElementById("advert")!;
  advert.style.opacity = "0";
  advert.style.marginBottom = "0%";
  setTimeout(deleteAdvert, 1000);
};

const deleteAdvert = () => {
  const advert = document.getElementById("advert")!;
  advert.remove();
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

    prepareAdvert();
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
  prepareAdvert(videoProgress);
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

import { XORShift } from "random-seedable";
import { LONG_VIDEO_TIME, OFF_AIR_VIDEO_ID, SEED } from "./constants.js";
import { Genre } from "./database.js";
import { createSchedule, displaySchedule, ScheduleVideo } from "./schedule.js";
import {
  flattenSchedule,
  formatTime,
  getEightAmDate,
  isFirstForDay,
} from "./utils.js";

const random = new XORShift(SEED);

const videoFooter = document.getElementById("video-footer")!;
let onAir = true;

/////////////////////////////// SCHEDULE ///////////////////////////////

const loadTime = Date.now();

const schedule = createSchedule(random, loadTime);

const flattenedSchedule = flattenSchedule(schedule);

let currentVideoIndex = 0;
while (loadTime > flattenedSchedule[currentVideoIndex + 1].startTime) {
  currentVideoIndex++;
}

const firstVideoStartTime =
  loadTime - flattenedSchedule[currentVideoIndex].startTime;

displaySchedule(schedule, loadTime);

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
    random.float() < 0.5;

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

  if (video.type === "ident" || !onAir) return;

  const scheduleFromNow = flattenedSchedule
    .slice(currentVideoIndex + 1)
    .filter((item) => item.type === "video");
  const upcomingVideos: ScheduleVideo[] = [];
  for (let i = 0; i < 4; i++) {
    const upcomingVideo = scheduleFromNow[i];
    if (isFirstForDay(upcomingVideo)) break;
    upcomingVideos.push(upcomingVideo);
  }

  if (
    upcomingVideos.length > 0 &&
    video.genre !== Genre.Trailer &&
    (video.endTime ?? video.length) >= 45
  ) {
    if ((video.endTime ?? video.length) >= LONG_VIDEO_TIME) {
      const advertProps1 = getAdvertData(upcomingVideos);
      const advertProps2 = getAdvertData(upcomingVideos);

      const halfwayThroughVideo = (video.endTime ?? video.length) / 2;

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

      const advertTimestamp = (3 * (video.endTime ?? video.length)) / 4;
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

/////////////////////////////// IDENT TEXT ///////////////////////////////

type IdentTextData = {
  title: string;
  time: string;
  duration: number;
};

const prepareIdentText = (videoProgress: number = 0) => {
  const video = flattenedSchedule[currentVideoIndex];

  if (video.type === "ident" && video.promote) {
    const promoteVideo = flattenedSchedule
      .slice(currentVideoIndex + 1)
      .find((item) => item.id === video.promote?.id);

    const identWait = video.promote.textAppear + 0.7 - videoProgress;

    if (promoteVideo && "title" in promoteVideo && identWait > 0) {
      setTimeout(() => {
        showIdentText({
          title: video.promote!.title,
          time: formatTime(promoteVideo.startTime),
          duration: video.length - video.promote!.textAppear,
        });
      }, identWait * 1000);
    }
  }
};

const showIdentText = ({ title, time, duration }: IdentTextData) => {
  const bannerContainer = document.getElementById("banner-container")!;
  const identText = document.createElement("div");
  identText.id = "ident-text";
  identText.innerHTML = `<p>${title}</p><p>${time}</p>`;
  identText.style.transition = `opacity 0.6s linear, transform ${duration}s linear`;
  bannerContainer.appendChild(identText);

  // Start animation
  void identText.offsetHeight;

  identText.style.opacity = "1";
  // Defer transform to next frame so transition has a "from" state to animate from
  requestAnimationFrame(() => {
    identText.style.transform = "scale(1.25)";
  });
};

const clearIdentText = () => {
  const identText = document.getElementById("ident-text")!;
  identText?.remove();
};

/////////////////////////////// VIDEO PLAYER ///////////////////////////////

let player: YT.Player | undefined;

const updateVideoTitle = () => {
  const currentItem = flattenedSchedule[currentVideoIndex];
  if (currentItem.type === "video" && onAir) {
    videoFooter.innerHTML = `Currently playing: <span id="current-video-title">${currentItem.title}</span>`;
  } else {
    videoFooter.innerHTML = "";
  }
};

function nextVideo(): void {
  onAir = true;
  currentVideoIndex++;
  const video = flattenedSchedule[currentVideoIndex];

  if (player) {
    player.loadVideoById(video.id, 0, "hd1080");
    player.unMute();
    updateVideoTitle();
    clearIdentText();

    prepareAdverts();
    prepareIdentText();
  }

  // Skip endcards etc
  if ("endTime" in video && video.endTime) {
    setTimeout(nextVideo, video.endTime * 1000);
  }
}

function offAirVideo(): void {
  if (player) {
    player.loadVideoById(OFF_AIR_VIDEO_ID, 0, "hd1080");
    updateVideoTitle();
  }

  const timeUntilNextVideo = flattenedSchedule[currentVideoIndex + 1].startTime - Date.now();

  setTimeout(nextVideo, timeUntilNextVideo);
}

function stillBroadcasting(videoProgress: number = 0): boolean {
  // TODO - remove
  if (videoProgress ===0) return false;

  const currentVideo = flattenedSchedule[currentVideoIndex];
  if (currentVideo.type === "ident") return true;

  if (videoProgress > (currentVideo.endTime ?? currentVideo.length)) {
    return false;
  }

  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  console.log(currentHour);
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
  const currentItem = flattenedSchedule[currentVideoIndex];

  const videoProgress = Math.floor(firstVideoStartTime / 1000);

  // Check if we've stopped broadcasting for the day
  onAir = stillBroadcasting(videoProgress);

  player = new YT.Player("yt-player", {
    videoId: onAir ? currentItem.id : OFF_AIR_VIDEO_ID,
    playerVars: {
      autoplay: 1,
      loop: 0,
      mute: 1,
      controls: 0,
      showinfo: 0,
      rel: 0,
      start: onAir ? videoProgress : 0,
    },
    events: {
      onReady(event: YT.PlayerEvent) {
        event.target.setPlaybackQuality("hd1080");
      },
      onStateChange(event: YT.OnStateChangeEvent) {
        if (event.data === YT.PlayerState.ENDED) {
          const wasOnAir = onAir;
          // Check if we've stopped broadcasting for the day
          onAir = stillBroadcasting();

          if (onAir) {
            nextVideo();
          } else {
            if (wasOnAir) {
              offAirVideo();
            } else player!.playVideo();
          }
        }
      },
    },
  });

  updateVideoTitle();

  if (onAir) {
    prepareAdverts(videoProgress);
    prepareIdentText(videoProgress);

    if ("endTime" in currentItem && currentItem.endTime) {
      const timeUntilEnd = (currentItem.endTime - videoProgress) * 1000;
      setTimeout(nextVideo, timeUntilEnd);
    }
  } else {
    const timeUntilNextVideo = flattenedSchedule[currentVideoIndex + 1].startTime - Date.now();
  
    setTimeout(nextVideo, timeUntilNextVideo);
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

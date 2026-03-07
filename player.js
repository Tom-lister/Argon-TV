const SCHEDULE = ["6TsEJwD4zlc", "Te3i3h_7FIs", "pvujSmljshw"];

let player;
let currentVideoIndex = 0;

function nextVideo() {
  currentVideoIndex = (currentVideoIndex + 1) % SCHEDULE.length;
  switchToVideo(SCHEDULE[currentVideoIndex]);
}

function switchToVideo(videoId) {
  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    player.unMute();
  }
}

function initPlayer() {
  player = new YT.Player("yt-player", {
    videoId: SCHEDULE[0],
    playerVars: {
      autoplay: 1,
      loop: 0,
      mute: 1,
      controls: 0,
      showinfo: 0,
      rel: 0,
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

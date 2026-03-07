import { VideoGroup, VIDEOS, VideoTag, VideoType } from "./videos.js";
import { XORShift } from "random-seedable";
// 8:30pm, March 7th, 2026 (GMT)
const START_TIME = 1772915400000;
// 6 hours
const SCHEDULE_LENGTH = 1000 * 60 * 60 * 6;
const LARGE_ITEM_PROBABILITIES = [0, 0, 0.15, 0.3, 0.45, 0.6, 0.8, 1];
const createScheduleMarathon = (videos, title) => ({
    title: videos.length == 2 ? `${title}: Back to Back` : `${title} Marathon`,
    videos,
});
export const createSchedule = (currentTime) => {
    const random = new XORShift(123456789);
    const schedule = [];
    let timeUntilScheduleEnds = START_TIME - currentTime;
    let largeItemProbabilityIndex = 0;
    while (timeUntilScheduleEnds < SCHEDULE_LENGTH) {
        const largeItem = random.randRange(0, 1) <
            LARGE_ITEM_PROBABILITIES[largeItemProbabilityIndex];
        if (largeItem) {
            // Get marathon or long video
            largeItemProbabilityIndex = 0;
            const largeItemType = random.choice([
                "tagMarathon",
                "groupMarathon",
                "longVideo",
            ]);
            switch (largeItemType) {
                case "tagMarathon":
                    const randomTag = random.choice(Object.values(VideoTag));
                    const videosWithTag = VIDEOS.filter((video) => video.tags?.includes(randomTag));
                    random.shuffle(videosWithTag);
                    const randomVideos = videosWithTag.slice(0, 4);
                    const tagMarathonVideos = randomVideos.map((video) => {
                        const videoWithStartTime = {
                            ...video,
                            startTime: currentTime + timeUntilScheduleEnds,
                        };
                        timeUntilScheduleEnds += videoWithStartTime.length * 1000;
                        return videoWithStartTime;
                    });
                    schedule.push(createScheduleMarathon(tagMarathonVideos, randomTag));
                    break;
                case "groupMarathon":
                    const randomGroup = random.choice(Object.values(VideoGroup));
                    const videosWithGroup = VIDEOS.filter((video) => video.group === randomGroup);
                    videosWithGroup.reverse();
                    const groupMarathonVideos = videosWithGroup.map((video) => {
                        const videoWithStartTime = {
                            ...video,
                            startTime: currentTime + timeUntilScheduleEnds,
                        };
                        timeUntilScheduleEnds += videoWithStartTime.length * 1000;
                        return videoWithStartTime;
                    });
                    schedule.push(createScheduleMarathon(groupMarathonVideos, randomGroup));
                    break;
                case "longVideo":
                    const longVideos = VIDEOS.filter((video) => video.length >= 60 * 30);
                    const randomLongVideo = random.choice(longVideos);
                    schedule.push({
                        ...randomLongVideo,
                        startTime: currentTime + timeUntilScheduleEnds,
                    });
                    timeUntilScheduleEnds += randomLongVideo.length * 1000;
                    break;
            }
        }
        else {
            // Get single video
            largeItemProbabilityIndex++;
            const filteredVideos = VIDEOS.filter((video) => video.type !== VideoType.Update && video.length < 60 * 30);
            const randomVideo = random.choice(filteredVideos);
            schedule.push({
                ...randomVideo,
                startTime: currentTime + timeUntilScheduleEnds,
            });
            timeUntilScheduleEnds += randomVideo.length * 1000;
        }
    }
    return schedule;
};

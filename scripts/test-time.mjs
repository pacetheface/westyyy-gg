import { buildSchedule, formatRange, zonedWallTimeToDate } from "../js/time.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const winter = zonedWallTimeToDate(2026, 11, 4, 18, 0, "Europe/Berlin");
assert(winter.toISOString() === "2026-11-04T17:00:00.000Z", `winter offset ${winter.toISOString()}`);

const summer = zonedWallTimeToDate(2026, 7, 1, 18, 0, "Europe/Berlin");
assert(summer.toISOString() === "2026-07-01T16:00:00.000Z", `summer offset ${summer.toISOString()}`);

const schedule = {
  timezone: "Europe/Berlin",
  weekly: [
    { day: "wednesday", start: "18:00", end: "20:00", title: "Ranked" },
    { day: "sunday", start: "15:00", end: "17:30", title: "Ranked" }
  ],
  oneOff: [
    { date: "2020-01-01", start: "12:00", end: "13:00", title: "Old" },
    { date: "2026-11-14", start: "16:00", end: "18:00", title: "Extra session" }
  ]
};

const friday = new Date("2026-11-06T09:00:00.000Z");
const upcoming = buildSchedule(schedule, friday);
assert(upcoming.next.id === "weekly-sunday-15:00", upcoming.next.id);
assert(upcoming.next.startAt.toISOString() === "2026-11-08T14:00:00.000Z", upcoming.next.startAt.toISOString());
const wednesday = upcoming.weekly.find((item) => item.id === "weekly-wednesday-18:00");
assert(wednesday.startAt.toISOString() === "2026-11-11T17:00:00.000Z", wednesday.startAt.toISOString());
assert(upcoming.oneOff.length === 1, "past one-off hidden");
assert(upcoming.oneOff[0].title === "Extra session", "future one-off kept");
assert(upcoming.weekly[0].everyLabel === "Every Wednesday", "monday-first still keeps wednesday");

const during = new Date("2026-11-04T17:30:00.000Z");
const liveWindow = buildSchedule(schedule, during);
assert(liveWindow.next.ongoing === true, "slot in progress");
assert(liveWindow.next.id === "weekly-wednesday-18:00", "ongoing wednesday");

const ended = new Date("2026-11-04T19:30:00.000Z");
const after = buildSchedule(schedule, ended);
assert(after.next.id === "weekly-sunday-15:00", after.next.id);
assert(after.weekly.find((item) => item.id === "weekly-wednesday-18:00").startAt.toISOString() === "2026-11-11T17:00:00.000Z", "rolls wednesday to next week");

const range = formatRange(
  new Date("2026-11-11T17:00:00.000Z"),
  new Date("2026-11-11T19:00:00.000Z"),
  "America/New_York"
);
assert(range.text === "Wed 11 Nov, 12:00–14:00", `format ${range.text}`);

const sameZone = formatRange(winter, new Date("2026-11-04T19:00:00.000Z"), "Europe/Berlin");
assert(sameZone.text === "Wed 4 Nov, 18:00–20:00", `berlin format ${sameZone.text}`);

console.log("time tests passed");

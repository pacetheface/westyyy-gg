export const SOURCE_ZONE = "Europe/Berlin";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const DAY_LABEL = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday"
};

const MONDAY_FIRST = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6
};

export function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SOURCE_ZONE;
  } catch {
    return SOURCE_ZONE;
  }
}

function partsInZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const map = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function zoneOffsetMs(date, timeZone) {
  const parts = partsInZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedWallTimeToDate(year, month, day, hour, minute, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset1 = zoneOffsetMs(new Date(utcGuess), timeZone);
  let instant = utcGuess - offset1;
  const offset2 = zoneOffsetMs(new Date(instant), timeZone);
  if (offset2 !== offset1) instant = utcGuess - offset2;
  return new Date(instant);
}

function addDays(year, month, day, amount) {
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function civilWeekday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatRange(start, end, timeZone) {
  const dayFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  const timeFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const startDay = dayFormat.format(start);
  const endDay = dayFormat.format(end);
  const startTime = timeFormat.format(start);
  const endTime = timeFormat.format(end);
  const text = startDay === endDay
    ? `${startDay}, ${startTime}–${endTime}`
    : `${startDay}, ${startTime} – ${endDay}, ${endTime}`;
  return { text, startIso: start.toISOString(), endIso: end.toISOString() };
}

function occurrence(year, month, day, start, end, timeZone, now) {
  const startAt = zonedWallTimeToDate(year, month, day, start.hour, start.minute, timeZone);
  let endAt = zonedWallTimeToDate(year, month, day, end.hour, end.minute, timeZone);
  if (endAt <= startAt) {
    const next = addDays(year, month, day, 1);
    endAt = zonedWallTimeToDate(next.year, next.month, next.day, end.hour, end.minute, timeZone);
  }
  if (endAt <= now) return null;
  return {
    startAt,
    endAt,
    ongoing: startAt <= now && now < endAt
  };
}

export function buildSchedule(schedule, now = new Date()) {
  const zone = schedule && typeof schedule.timezone === "string" && schedule.timezone
    ? schedule.timezone
    : SOURCE_ZONE;
  const weekly = [];
  const oneOff = [];
  const today = partsInZone(now, zone);

  for (const slot of (schedule && schedule.weekly) || []) {
    const start = parseTime(slot && slot.start);
    const end = parseTime(slot && slot.end);
    const dayName = String((slot && slot.day) || "").toLowerCase();
    const target = WEEKDAYS.indexOf(dayName);
    if (!start || !end || target < 0 || !slot.title) continue;
    for (let offset = 0; offset < 8; offset += 1) {
      const date = addDays(today.year, today.month, today.day, offset);
      if (civilWeekday(date.year, date.month, date.day) !== target) continue;
      const when = occurrence(date.year, date.month, date.day, start, end, zone, now);
      if (!when) continue;
      weekly.push({
        id: `weekly-${dayName}-${slot.start}`,
        kind: "weekly",
        title: String(slot.title),
        everyLabel: `Every ${DAY_LABEL[dayName]}`,
        dayIndex: MONDAY_FIRST[dayName],
        ...when
      });
      break;
    }
  }

  for (const slot of (schedule && schedule.oneOff) || []) {
    const start = parseTime(slot && slot.start);
    const end = parseTime(slot && slot.end);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((slot && slot.date) || "");
    if (!start || !end || !match || !slot.title) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const when = occurrence(year, month, day, start, end, zone, now);
    if (!when) continue;
    oneOff.push({
      id: `once-${slot.date}-${slot.start}`,
      kind: "once",
      title: String(slot.title),
      everyLabel: "One-off",
      dayIndex: 0,
      ...when
    });
  }

  weekly.sort((a, b) => a.dayIndex - b.dayIndex || a.startAt - b.startAt);
  oneOff.sort((a, b) => a.startAt - b.startAt);

  const pool = [...weekly, ...oneOff].sort((a, b) => a.startAt - b.startAt);
  const next = pool.find((item) => item.ongoing) || pool[0] || null;
  return { zone, weekly, oneOff, next };
}

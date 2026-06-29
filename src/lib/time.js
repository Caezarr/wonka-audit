const DAY_MS = 24 * 60 * 60 * 1000;

export function deriveWindow(args) {
  if (args.since || args.until) {
    const start = args.since ? new Date(args.since) : new Date(Date.now() - 30 * DAY_MS);
    const end = args.until ? endOfDay(new Date(args.until)) : new Date();
    assertValidDate(start, "--since");
    assertValidDate(end, "--until");
    return { start, end };
  }

  if (!args.trainingDate) {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * DAY_MS);
    return { start, end };
  }

  const training = new Date(args.trainingDate);
  assertValidDate(training, "--training-date");
  const period = String(args.period || "m1").toLowerCase();
  if (period === "m0") {
    return {
      start: new Date(training.getTime() - 30 * DAY_MS),
      end: new Date(training.getTime() - 1)
    };
  }
  const match = period.match(/^m([1-3])$/);
  if (!match) throw new Error("--period must be one of m0, m1, m2, m3");
  const month = Number(match[1]);
  return {
    start: new Date(training.getTime() + (month - 1) * 30 * DAY_MS),
    end: new Date(training.getTime() + month * 30 * DAY_MS - 1)
  };
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function assertValidDate(date, label) {
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date for ${label}`);
}

export function inWindow(ts, window) {
  return ts >= window.start.getTime() && ts <= window.end.getTime();
}

export function iso(date) {
  return date.toISOString();
}


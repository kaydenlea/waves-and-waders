import http from "k6/http";
import { sleep, check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const BEACH_ID = __ENV.BEACH_ID || "1";
const VIEWPORT = __ENV.VIEWPORT || "-124.6,32.5,-117.0,42.2";
const USERS = Number(__ENV.USERS || 50);
const DURATION = __ENV.DURATION || "2m";

export const options = {
  vus: USERS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

function isoDaysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export default function () {
  const startDate = isoDaysFromNow(0);
  const endDate = isoDaysFromNow(7);

  const routes = [
    `${BASE_URL}/api/forecast?beachId=${BEACH_ID}&startDate=${startDate}&endDate=${endDate}`,
    `${BASE_URL}/api/tides?beachId=${BEACH_ID}&startDate=${startDate}&endDate=${endDate}`,
    `${BASE_URL}/api/forecast/${BEACH_ID}/current`,
    `${BASE_URL}/api/forecast/${BEACH_ID}/week`,
    `${BASE_URL}/api/beaches`,
    `${BASE_URL}/api/beaches/viewport?bounds=${encodeURIComponent(
      VIEWPORT
    )}&includeStats=1&statsLimit=12`,
  ];

  for (const url of routes) {
    const res = http.get(url, {
      headers: { "User-Agent": "k6-load" },
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
    });
  }

  sleep(1);
}

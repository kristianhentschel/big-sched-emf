import { browser, building } from '$app/environment';

export const load = async ({ fetch, data }) => {
  let schedule = [];

  if (!building) {
    console.log(`fetching schedule in browser ${browser}`);
    const response = await fetch("https://www.emfcamp.org/schedule/2026.json");
    schedule = await response.json();
    console.log(`Fetched ${schedule.length} events.`);
  } else {
    console.log("Not fetching schedule because prerendering static site");
  }

  return {
    ...data,
    schedule,
  };
};
<script lang="ts">
  import { browser } from "$app/environment";
  import ScheduleView from "$lib/ScheduleView.svelte";
  import { onMount } from "svelte";
  import ical from "ical";
  import { DateTime } from "luxon";

  export let data;

  const { schedule } = data;
  let { faves } = data;

  type View = { [key: string]: { [key: string]: boolean } };

  let view: View = {
    venues: {
      "Stage A": true,
      "Stage B": true,
      "Stage C": true,
      "Stage D": true,
    },
    days: {
      "2026-07-16": true,
      "2026-07-17": true,
      "2026-07-18": true,
      "2026-07-19": true,
    },
    types: {
      performance: true,
      talk: true,
      workshop: true,
      youthworkshop: true,
    },
  };

  let mounted = false;
  const updateHash = (view: View) => {
    if (!browser || !mounted) return;

    const params = new URLSearchParams();

    for (const key of ["venues", "days", "types"]) {
      if (key in view) {
        params.set(
          key,
          Object.keys(view[key])
            .filter((v) => view[key][v])
            .join(","),
        );
      }
    }

    location.hash = params.toString();
  };

  $: updateHash(view);

  let liveFaves = false;
  onMount(() => {
    if (browser && location.hash) {
      try {
        const params = new URLSearchParams(`?${location.hash.slice(1)}`);
        const newView: typeof view = {};
        for (const key of ["venues", "days", "types"]) {
          if (params.has(key)) {
            newView[key] = {};
            for (const value of params.get(key)?.split(",") ?? []) {
              newView[key][value] = true;
            }
          }
        }
        view = newView;
      } catch (e) {
        console.log("failed to parse hash");
      }
    }
    mounted = true;
    updateHash(view);
  });

  let localFaves = false;
  const localFavesKey = "bigsched.faves";

  const clearLocalFaves = () => {
    window.localStorage.removeItem(localFavesKey);
    faves = [];
    localFaves = false;
  };

  onMount(async () => {
    if (faves?.length) {
      liveFaves = true;
    } else {
      try {
        const tmp = window.localStorage.getItem(localFavesKey);
        if (tmp) {
          faves = (JSON.parse(tmp) as number[]).filter((f) =>
            Number.isInteger(f),
          );
          localFaves = true;
          console.log(
            `Restored ${faves.length} favourites from local storage.`,
          );
          console.debug(faves)
        }
      } catch (e) {
        clearLocalFaves();
      }
    }
  });

  const readFileAsText = async (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.readAsText(f);
        reader.addEventListener("load", () => {
          resolve(reader.result as string);
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  const readFileAsJSON = async (f: File) => {
    return JSON.parse((await readFileAsText(f)) as string);
  };

  let favesFile: FileList;
  const handleLoadFaves = async (e: Event) => {
    e.preventDefault();

    if (!favesFile?.length) {
      return;
    }

    const result = (await readFileAsJSON(favesFile[0])) as { id: number }[];

    faves = result.map(({ id }) => id);
    window.localStorage.setItem(localFavesKey, JSON.stringify(faves));
    localFaves = true;
    console.log(`Imported ${faves.length} favourites from file.`);
  };

  let shifts: {
    start: DateTime;
    end: DateTime;
    title: string;
    venue: string;
    start_time: string;
    end_time: string;
    day: string;
  }[] = [];
  let shiftsFile: FileList;
  const localShiftsKey = "bigsched.shifts";
  const clearLocalShifts = () => {
    window.localStorage.removeItem(localShiftsKey);
    shifts = [];
  };

  const restoreShift = (s: {
    start?: string | Date;
    end?: string | Date;
    location?: string;
    summary?: string;
  }) => {
    const { start, end, location, summary } = s;
    if (start && end && location && summary) {
      const startDt =
        typeof start === "string"
          ? DateTime.fromISO(start)
          : DateTime.fromJSDate(start);
      const endDt =
        typeof end === "string"
          ? DateTime.fromISO(end)
          : DateTime.fromJSDate(end);
      if (startDt.isValid && endDt.isValid) {
        shifts.push({
          start_time: startDt.toLocaleString(DateTime.TIME_SIMPLE),
          end_time: endDt.toLocaleString(DateTime.TIME_SIMPLE),
          start: startDt,
          end: endDt,
          venue: location,
          title: summary,
          day: startDt.toISODate(),
        });
      } else {
        throw new Error(`Invalid dates ${start} or ${end}`);
      }
    }
  };

  const handleLoadShifts = async (e: Event) => {
    e.preventDefault();
    try {
      const cal = ical.parseICS(await readFileAsText(shiftsFile[0]));
      shifts = [];
      for (const s of Object.values(cal)) {
        restoreShift(s);
      }
      window.localStorage.setItem(
        localShiftsKey,
        JSON.stringify(
          shifts.map((s) => {
            return {
              start: s.start.toISO(),
              end: s.end.toISO(),
              location: s.venue,
              summary: s.title,
            };
          }),
        ),
      );

      console.log(`Imported ${shifts.length} shifts from file.`);
      shifts = shifts;
    } catch (e) {
      console.log(e);
    }
  };

  onMount(() => {
    const tmp = window.localStorage.getItem(localShiftsKey);
    if (tmp) {
      try {
        shifts = [];
        for (const s of JSON.parse(tmp)) {
          restoreShift(s);
        }
        console.log(`Restored ${shifts.length} shifts from local storage.`);
        shifts = shifts;
      } catch (e) {
        console.log(e);
        clearLocalShifts();
      }
    }
  });

  $: view.venues["_shifts"] = shifts?.length > 0;
</script>

<svelte:head>
  <title>EMF2026 BigSched</title>
</svelte:head>

<ScheduleView {schedule} {faves} {shifts} bind:view />

<p>
  More info on <a href="https://github.com/kristianhentschel/big-sched-emf"
    >GitHub</a
  >. Made by Kristian Hentschel. This is a quick hack - no warranties of any
  kind implied. I take no responsibility for the consequences or lack thereof of
  relying on this page. View the
  <a href="https://www.emfcamp.org/schedule/2026"
    >the official schedule at emfcamp.org</a
  >.
</p>

{#if !liveFaves}
  <h1>Favourites</h1>

  <form on:submit={handleLoadFaves}>
    <p>
      If you're logged in to the EMF site, go to <a
        href="https://www.emfcamp.org/favourites"
        target="_blank">Favourites</a
      > and download a copy of the JSON feed. Then load that file below. This step
      has to be repeated every time you add something to your favourites. This site
      remembers the IDs of your favourites in your browser local storage for next
      time.
    </p>
    <p>
      <label
        >Load favourites.json: <input
          type="file"
          bind:files={favesFile}
          on:change={handleLoadFaves}
          accept=".json"
        /></label
      >
      {#if localFaves}
        <br />
        {faves?.length} favourites imported.
        <button type="button" on:click={clearLocalFaves}>Clear</button>
      {/if}
    </p>
  </form>
{/if}

<h1>Volunteer shifts</h1>

<form on:submit={handleLoadShifts}>
  <p>
    If you're logged in to the EMF site, go to <a
      href="https://www.emfcamp.org/volunteer/schedule"
      target="_blank">Volunteer Schedule</a
    >
    and download a copy of the iCal feed. Then load that file below.
    <strong
      >The feed is not automatically refreshed &mdash; also add it to your
      calendar or check the official site in case something changes.</strong
    > This site remembers the times, titles, and locations of your shifts in your
    browser local storage for next time.
  </p>
  <p>
    <label
      >Load schedule.ics: <input
        type="file"
        bind:files={shiftsFile}
        on:change={handleLoadShifts}
        accept=".ics"
      /></label
    >
    {#if shifts?.length}
      <br />
      {shifts.length} shifts loaded.
      <button type="button" on:click={clearLocalShifts}>Clear</button>
    {/if}
  </p>
</form>

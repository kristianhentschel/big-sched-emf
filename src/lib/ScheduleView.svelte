<script lang="ts">
  import { DateTime } from "luxon";
  import { readSchedule } from "./schedule";
  import { onMount } from "svelte";

  export let schedule;
  export let faves;
  export let view;
  export let shifts;

  if (!view.venues) {
    view.venues = {};
  }

  if (!view.days) {
    view.days = {};
  }

  if (!view.types) {
    view.types = {};
  }

  $: ({ days, venues, types, events } = readSchedule(schedule));

  $: filteredEvents = events.filter(
    (e) =>
      view?.days?.[e.day] &&
      (view?.venues?._other || view?.venues?.[e.venue]) &&
      view?.types?.[e.type],
  );

  let dayStart: { [key: string]: number } = {};
  let dayEnd: { [key: string]: number } = {};

  const updateDayTimes = (filteredEvents: any[]) => {
    dayStart = {};
    dayEnd = {};

    filteredEvents.forEach((event) => {
      const day = event.day;
      const maxDayEndMillis = DateTime.fromISO(day, { zone: "Europe/London" })
        .set({ hour: 0 })
        .plus({ hours: 26 })
        .toMillis(); // Events that go on past 2 am may overflow the container
      if (!dayStart[day] || event.start.toMillis() < dayStart[day]) {
        dayStart[day] = event.start.toMillis();
      }
      if (!dayEnd[day] || event.end.toMillis() > dayEnd[day]) {
        dayEnd[day] = Math.min(maxDayEndMillis, event.end.toMillis());
      }

      if (faves && faves.includes(event.id)) {
        event.is_fave = true;
      }
    });

      console.debug(filteredEvents)
  };

  $: updateDayTimes(filteredEvents);

  const formatDay = (day: string) =>
    DateTime.fromISO(day).toLocaleString({
      ...DateTime.DATE_SHORT,
      weekday: "long",
    });

  let nowMillis = 0;

  onMount(() => {
    const updateNow = () => {
      nowMillis = DateTime.now().toMillis();
    };

    updateNow();

    const t = setInterval(updateNow, 6000);

    return () => {
      clearInterval(t);
    };
  });

  const showFilters = {
    venue: true,
    day: true,
    type: true,
  };

  const eventsFor = (venue: string, day: string) => {
    if (venue === "_other") {
      const otherVenues = venues.filter((v) => !view.venues[v]);
      return filteredEvents.filter(
        (e) => e.day === day && otherVenues.includes(e.venue),
      );
    } else if (venue === "_shifts") {
      return shifts.filter((e: any) => e.day === day); // TODO type for shifts
    } else {
      return filteredEvents.filter((e) => e.venue === venue && e.day === day);
    }
  };

  const specialVenues: { [key: string]: string } = {
    _other: "Other venues",
    _shifts: "Volunteer shifts",
  };
</script>

<h1 class="schedule-title">Schedule</h1>

<h2 class="section-title">Events</h2>

{#each days.filter((d) => view.days[d]) as day (day)}
  <h3 class="day-title">{formatDay(day)}</h3>
  <div
    class="day"
    style="--day-start-millis: {dayStart[day]}; --day-end-millis: {dayEnd[
      day
    ]}; --now-millis: {nowMillis};"
  >
    {#each [...venues, "_other", "_shifts"].filter((v) => view.venues[v]) as venue (venue)}
      <div
        class="venue-wrapper"
        class:shifts={venue === "_shifts"}
        class:other={venue === "_other"}
      >
        <h4 class="venue-title">{specialVenues[venue] ?? venue}</h4>
        <div class="venue" class:other={venue === "_other"}>
          {#if dayStart[day] <= nowMillis && nowMillis <= dayEnd[day]}
            <hr class="now" />
          {/if}
          {#each eventsFor(venue, day) as event (event.occurrence_id)}
            <div
              class="event type-{event.type}"
              class:fave={event.is_fave}
              class:not-recorded={!["public"].includes(
                event?.video_privacy ?? "n/a",
              )}
              class:ended={event.end.toMillis() < nowMillis}
              style="--start-millis: {event.start.toMillis()}; --end-millis: {Math.min(
                dayEnd[day],
                event.end.toMillis(),
              )}"
            >
              <h5 class="title">
                <a href={event.link} target="_blank" tabindex="0"
                  >{event.title}</a
                >
              </h5>
              <p class="times">
                {event.start.toLocaleString({ weekday: "short" })}
                {event.start_time}-{event.end_time}

                {event.venue}
              </p>

              {#if event.speaker}
                <p class="speaker">{event.speaker}</p>
              {/if}
              {#if event.content_note}
                <p class="description">Content note: {event.content_note}</p>
              {/if}
              {#if event.description}
                <p class="description">{event.description}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/each}

<h2 class="section-title">Filters</h2>
<p>{filteredEvents.length} / {events.length}</p>
<div class="filters">
  <div>
    <h3 class="filter-title">
      <label
        >Venues <input
          title="show venue filters"
          type="checkbox"
          bind:checked={showFilters["venue"]}
        /></label
      >
    </h3>
    <ul class:hidden={!showFilters["venue"]}>
      {#each venues as venue (venue)}
        <li>
          <label>
            <input
              type="checkbox"
              name={venue}
              bind:checked={view.venues[venue]}
            />
            {venue}
          </label>
        </li>
      {/each}
      <li>
        <label>
          <input
            type="checkbox"
            name="_shifts"
            bind:checked={view.venues["_shifts"]}
          />
          <em>Show volunteer shifts</em>
        </label>
      </li>
      <li>
        <label>
          <input
            type="checkbox"
            name="_other"
            bind:checked={view.venues["_other"]}
          />
          <em>Show unchecked venues in last column</em>
        </label>
      </li>
    </ul>
  </div>
  <div>
    <h3 class="filter-title">
      <label
        >Days <input
          title="show day filters"
          type="checkbox"
          bind:checked={showFilters["day"]}
        /></label
      >
    </h3>
    <ul class:hidden={!showFilters["day"]}>
      {#each days as day (day)}
        <li>
          <label>
            <input type="checkbox" name={day} bind:checked={view.days[day]} />
            {formatDay(day)}
          </label>
        </li>
      {/each}
    </ul>
  </div>
  <div>
    <h3 class="filter-title">
      <label
        >Types <input
          title="show type filters"
          type="checkbox"
          bind:checked={showFilters["type"]}
        /></label
      >
    </h3>
    <ul class:hidden={!showFilters["type"]}>
      {#each types as t (t)}
        <li>
          <label>
            <input type="checkbox" name={t} bind:checked={view.types[t]} />
            {t}
          </label>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style lang="scss">
  :global(html, body) {
    font-family: sans-serif;
    font-size: 10pt;
  }

  :global(a) {
    &:link {
      color: #00f;
    }
    &:visited {
      color: #60f;
    }
  }

  $scale: calc(
    1.25 * 6rem / 3600 / 1000
  ); // 6 lines per hour, most talks need 2 lines and are 20 minutes long

  .day {
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;
  }

  .venue-wrapper {
    width: 100%;
    flex-shrink: 1;
    max-width: 20em;
    &.other {
      flex-grow: 1;
      max-width: 100%;
    }

    &.shifts {
      max-width: 10em;
      flex-shrink: 2;

      .event {
        background: #9c6;
      }
    }
  }

  .venue {
    display: flex;
    flex-direction: column;
    position: relative;
    height: calc((var(--day-end-millis) - var(--day-start-millis)) * $scale);
  }

  .event {
    display: flex;
    flex-direction: column;
    padding: 4px;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;

    background: #fed;
    border: 1px solid #fc3;

    .venue.other & {
      opacity: 0.5;
      width: 50%;

      $num: 20;
      @for $i from 1 through $num {
        &:nth-child(#{$num}n + #{$i}) {
          left: ((50% / $num) * $i);
          margin-top: (0.5em * $i);
        }
      }

      &:hover,
      &:focus-within {
        left: 0;
        width: 100%;
        opacity: 1;
      }
    }

    &.ended {
      opacity: 0.5;
      text-decoration: line-through;
    }

    &.fave {
      background: #fcc;

      .title:after {
        content: "<3";
        font-family: monospace;
        font-size: 0.6em;
        vertical-align: super;
        font-weight: bold;
        color: #c00;
      }
    }

    &.not-recorded {
      border-color: black;
      border-style: dashed;
    }

    .title {
      margin: 0;
      font-size: 1rem;
      font-weight: bold;
      line-height: 1.2;
      margin-bottom: 0.2em;
    }

    p {
      margin: 0.2rem 0;
      font-size: 0.8rem;
    }

    .times {
      color: #333;
    }

    .speaker {
      font-weight: bold;
    }

    .description {
      white-space: pre-wrap;
      line-height: 1.2;
      text-align: justify;
      hyphens: auto;
    }

    position: absolute;
    top: calc((var(--start-millis) - var(--day-start-millis)) * $scale);
    $height: calc((var(--end-millis) - var(--start-millis)) * $scale);
    height: $height;
    transform: scale(1);
    box-shadow: 4px 4px rgba(0, 0, 0, 0);

    transition: all 0.1s ease-out;

    &:hover,
    &:focus-within {
      z-index: 100;
      height: auto;
      min-height: $height;
      transform: scale(1.01);
      box-shadow: 4px 4px rgba(0, 0, 0, 0.5);
    }
  }

  .now {
    position: absolute;
    top: calc((var(--now-millis) - var(--day-start-millis)) * $scale);
    border: none;
    border-top: 3px solid red;
    margin: 0;
    margin-top: -1px;
    width: 100%;
    z-index: 10;
    opacity: 40%;
    pointer-events: none;
  }

  .day-title,
  .venue-title {
    background: #eee;
    padding: 8px;
    text-align: center;
    margin: 0;
    margin-bottom: 8px;
    text-wrap: nowrap;
  }

  .day-title {
    margin-top: 8px;
  }

  .filters {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .hidden {
    display: none;
  }

  .section-title {
    margin: 8px 0;
  }

  .filter-title {
    margin: 4px 0;
  }

  .filters ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>

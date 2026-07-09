import { DateTime } from "luxon";

const zone = "Europe/London";
const format = "yyyy-MM-dd hh:mm:ss";

type ScheduleOccurrence = {
  occurrence_num: number,
  start_date: string,
  end_date: string,
  venue: string,
  latlon: number[],
  map_link: string,
  video_privacy: "none" | "public" | "review" | undefined,
  uses_lottery?: boolean,
};

type ScheduleEvent = {
  id: number,
  slug: string,
  title: string,
  names: string,
  pronouns: string,
  user_id: number,
  description: string,
  short_description: string,
  type: string,
  is_fave: boolean,
  official_content: boolean,
  content_note: string,
  source: string,
  link: string,
  video: {
    recording_lost: null
  },
  family_friendly?: boolean,
  occurrences: Array<ScheduleOccurrence>
};

type Schedule = ScheduleEvent[]

// TODO: This ugly type avoids having to change the view data model now that
// start/end times and venues are listed in occurrences instead of at the top level.
export type ExplodedSchedule = ScheduleEvent & ScheduleOccurrence & {
  occurrence_id: string,
  start: DateTime,
  end: DateTime,
  day: string,
};

export const readSchedule = (data: Schedule): {
  days: string[],
  venues: string[],
  types: string[],
  events: ExplodedSchedule[],
} => {
  const days: Set<string> = new Set();
  const venues: Set<string> = new Set();
  const types: Set<string> = new Set();
  const events = [];

  for (const event of data) {
    for (const occurrence of event.occurrences ?? [event]) {
      const { start_date, end_date, venue } = occurrence;

      const start = DateTime.fromFormat(start_date, format, { zone });
      const end = DateTime.fromFormat(end_date, format, { zone });
      const day = start.minus({ hours: 2 }).toISODate() ?? 'none'; // assume that nothing is scheduled to start after 2am the next morning

      days.add(day);
      venues.add(venue);
      types.add(event.type);

      events.push({
        ...event,
        ...occurrence,
        occurrence_id: `${event.id}_${occurrence.occurrence_num}`,
        start,
        end,
        day,
      });
    }
  }

  return {
    days: [...days].sort(),
    venues: [...venues].sort(),
    types: [...types].sort(),
    events: events.sort((a, b) => a.start.toMillis() - b.start.toMillis()),
  }
}
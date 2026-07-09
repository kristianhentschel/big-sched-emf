# Big Sched

This is an inofficial viewer for the EMF Camp 2026 schedule.

By default this shows the [public schedule](https://www.emfcamp.org/schedule/2026.json) from the [JSON feed](https://developer.emfcamp.org/schedule/).

To highlight your favourites, copy the JSON feed URL from https://www.emfcamp.org/favourites and run the app locally (assuming you're on a Mac/Linux and have git and Node.JS installed):

```sh
git clone https://github.com/kristianhentschel/big-sched-emf26.git && cd big-sched-emf26
npm install
FAVES_URL=https://www.emfcamp.org/favourites.json?token=xxxx-xxxxxxxxxxxxxxxxxxxx npm run dev
```

If you want to change it up, the layout and style (HTML-ish, JavaScript, SCSS) is mainly in [ScheduleView.svelte](./src/lib/ScheduleView.svelte).
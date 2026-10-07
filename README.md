# The Uncanny Valley

A lore site for *The Uncanny Valley*, a show by Emmett & friends.

**Live:** https://web-production-06099.up.railway.app

> The Uncanny Valley is a dimension created because of certain things that happened in our world. It's a replica of our world from 20 years ago, but it's different, and changed.

## What's on the site

| Page | What it is |
|---|---|
| [Lore](index.html) | The Big Ville, the ten circles, and what happens in the first world |
| [Entities](entities.html) | A field guide to the five stages and the insane entities. Click one to see how it behaves. |
| [People & Places](people.html) | Walter, the baseball kids, the school, the house, and the testing lab |
| [Suggestion Box](suggest.html) | Anyone can post an idea. It shows up on the wall after it's approved. |

## How it's built

- **Pages:** plain HTML and one shared stylesheet (`style.css`). No framework.
- **Server:** a small [Express](https://expressjs.com) app (`server.js`) that serves the pages and the suggestion box API.
- **Database:** PostgreSQL, which stores suggestions in a single `suggestions` table that's created automatically on startup.
- **Hosting:** [Railway](https://railway.com), with the web service and a Postgres database in one project.

### The suggestion box

- `POST /api/suggestions` saves a new suggestion as **pending**. It allows one post per visitor every 30 seconds, up to 1,000 characters.
- `GET /api/suggestions` returns only **approved** suggestions, which is what the public wall shows.
- `/admin` is a private page, locked with a username and password, where pending suggestions can be approved and any suggestion can be deleted.

## Run it on your Mac

You need Node 20+ and PostgreSQL running locally.

```bash
npm install
createdb uncanny
DATABASE_URL=postgres://localhost/uncanny ADMIN_PASSWORD=pick-a-local-password PORT=4321 npm start
```

Then open http://127.0.0.1:4321. The admin page is at http://127.0.0.1:4321/admin, with the username `emmett` and whatever `ADMIN_PASSWORD` you picked.

## Environment variables

| Name | What it's for |
|---|---|
| `DATABASE_URL` | Postgres connection string. On Railway, it points at the project's Postgres service. |
| `ADMIN_PASSWORD` | Password for `/admin`. The real one lives in 1Password and in Railway's variables, never in this repo. |
| `PORT` | Port to listen on. Railway sets this automatically. |

## Deploying

Pushing to GitHub does **not** update the live site. To deploy the current code:

```bash
railway up -s web --ci
```

---

© 2026 Emmett. All rights reserved.

# Papis

Papis is a private room for family and close friends. People create an account, join a circle with an invite code, and post updates the whole circle can see: text, photos, videos, voice notes, and files. Someone can also go live, and the others watch in the browser.

## Run it

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first person starts a circle and shares the invite code from the Family page. Everyone else joins with that code.

`npm run dev` starts the website on port 3000 and the live server on port 3001. Both need to be running for streams, presence, and instant updates.

## What lives where

- Accounts, circles, posts, comments, reactions, and live chat are stored in SQLite (`prisma/dev.db`).
- Photos, videos, voice notes, and files are stored on disk in `data/uploads`, and only circle members can open them.
- Live video uses WebRTC. The live server only passes the connection details between people. The video itself goes browser to browser.

A home connection can comfortably host a small circle, roughly a handful of viewers. Phones can browse and post over the local network, but cameras and microphones only work on a secure page. On this computer, use `localhost`.

## Before a real family uses it

Change `AUTH_SECRET` and `REALTIME_SECRET` in `.env` if this copy will leave your machine. Put Papis behind HTTPS if people will join from outside the house, and set `COOKIE_SECURE=true` once the certificate is real.

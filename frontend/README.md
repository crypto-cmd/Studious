This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Auth Redirect Setup (Vercel + Supabase)

To avoid OAuth redirecting back to localhost in production:

1. In Vercel project settings, set `NEXT_PUBLIC_SITE_URL` to your production frontend URL (for example `https://your-app.vercel.app` or your custom domain).
2. In Supabase Auth settings:
	 - Set `Site URL` to the same production URL.
	 - Add all expected callback URLs to `Redirect URLs`, such as:
		 - `https://your-app.vercel.app/*`
		 - `https://your-custom-domain.com/*`
		 - `http://localhost:3000/*` (for local development only)

## PWA Setup

This app is configured as a Progressive Web App with:

- Web app manifest at `/manifest.webmanifest`
- Service worker at `/sw.js` (registered in production)
- Installable app metadata in the root layout

### Testing PWA installability

Service workers are only registered in production mode.

1. Build and run production locally:

```bash
npm run build
npm run start
```

2. Open `http://localhost:3000`
3. In Chrome/Edge, check for the install button in the address bar.

### Updating service worker cache

When changing caching behavior in `public/sw.js`, bump `CACHE_VERSION` so old caches are removed on next visit.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

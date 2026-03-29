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
npm run user    # starts on port 3000
npm run admin   # starts on port 3001
npm run sangha  # starts on port 3002

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!


What's added:
FeatureDetailGPS Button"Detect GPS" button on both Current Address and Hometown cardsAuto-fillOn click → browser asks permission → fetches lat/lng → calls OpenStreetMap Nominatim API (free, no API key needed) → fills Area, City, State, Pincode, Street automaticallyCoordinates storedlat + lng saved in form state, shown as small badge below the buttonLoading stateSpinner + "Detecting..." while fetchingError handlingToast if permission denied or GPS fails, user can still fill manuallyOld addressesAdded all full fields (Flat, Building, Street, Area + City/State/Pincode)
The Nominatim API is completely free and works without any API key — perfect for frontend-only stage. When you add a backend, you can switch to Google Maps API for better accuracy.
# Alpha NYC Hub

One staff hub for the **Maiden Ln** and **Early Years** campuses. Access is limited to guides and staff on an access list that admins manage in the app.

## What's in it

| Tab | What it does | Who can edit |
| --- | --- | --- |
| **Home** | Cards for the Emergency contact list, the Off-campus tracker (links to the Attendance app) and Planning workshops | — |
| **Emergency** | Emergency contact list (tap-to-call) and emergency procedures, filterable by campus | Admins, Lead Guides |
| **Off-campus board** | Links out to the Off-Campus Today board in the Attendance app (`NEXT_PUBLIC_OFF_CAMPUS_URL`) | — |
| **Workshops** | Planning workshop schedule, seeded with the week of Oct 26 2026 | Admins, Lead Guides |
| **Maiden Ln** / **Early Years** | Campus pages: that campus's contacts, procedures, trips and workshops | — |
| **Early Years → Guide tools** | My classes, roster, student progress, log an observation, scan work with the camera *(sample data for now)* | — |
| **Early Years → Lead Guide** | Early Years at a glance, all students, classes *(sample data for now; admins and Lead Guides only)* | — |
| **Access** | Add or remove people and set their role | Admins only |

Roles: **Admin** (manages access), **Lead Guide**, **Guide**, **Staff**.

## How access works

1. Everyone signs in with Google (Supabase Auth).
2. After sign-in, the app looks up the person's email in `allowed_users`. If it isn't there, they see a "You're not on the list yet" page and nothing else.
3. Supabase row-level security enforces the same rules in the database, so the data is protected even outside the app:
   - only listed people can read anything;
   - only admins can change the access list (and admins can't remove themselves);
   - only admins and Lead Guides can edit contacts, procedures and workshops.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the migrations** in `supabase/migrations/`, in order, in the SQL editor (or with `supabase db push`).
3. **Make yourself the first admin:** edit `supabase/first-admin.sql` with your email and run it in the SQL editor.
4. **Turn on Google sign-in:** Supabase → Authentication → Sign In / Providers → Google. Add the Google OAuth client ID and secret, and add `https://<your-project>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud.
   Under Authentication → URL Configuration, set the Site URL to your deployed URL and add `http://localhost:3000/**` and `https://<your-domain>/**` to the redirect URLs.
5. **Environment variables:** copy `.env.example` to `.env.local` and fill in the project URL and anon/publishable key. Set the same two values in Vercel when you deploy.
6. Run it:

   ```bash
   npm install
   npm run dev     # http://localhost:3000
   ```

7. Sign in, open **Access**, and add your guides and staff.

## Project layout

```
app/
  login/, auth/, no-access/     sign-in flow
  (hub)/                        every page here requires a member on the access list
    page.tsx                    Home
    emergency/ off-campus/ workshops/ maiden-ln/ early-years/ access/
components/                     shared UI, Early Years Guide/Lead tools
lib/
  access.ts                     requireMember / requireRole
  actions.ts                    server actions (all writes)
  data.ts                       reads
  early-years/sample-data.ts    sample students and materials from the mockup
supabase/migrations/            tables, RLS policies, seeded workshops
```

## Next steps

- Connect the Early Years Guide and Lead tools to real rosters and save observations (they currently use sample data from the design mockup).
- Fill in emergency contacts and procedures for both campuses.

# Security

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through GitHub instead: go to the repository's **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it, and what an attacker could do with it.

You should get a reply within a week. Once a fix is out, you'll be credited in the release notes unless you'd rather not be.

## Scope

In scope: this app and its API routes (`app/api/rooms`), the database migrations, and how the app uses Supabase Realtime.

Out of scope: Supabase, Vercel or other providers themselves (report those to them), and denial of service by sheer traffic volume.

## How the app protects users

See [Privacy](README.md#privacy) and [Security](README.md#security) in the README for what's sent and stored, and the measures in place.

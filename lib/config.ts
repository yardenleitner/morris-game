// Shared secret the host screens send with every privileged request. It is a
// speed bump for a one-evening event on a local network, not real auth — being
// NEXT_PUBLIC_*, it ships to every phone that loads /play.
// Defaults so a fresh clone with no .env.local still runs; override it in
// .env.local if the URL is going to be visible to the audience.
export const HOST_KEY = process.env.NEXT_PUBLIC_HOST_KEY || 'morris';

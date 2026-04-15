// Client-safe constants split out from `card-authors-service.ts` so the
// CardAuthorEditor component can import them without pulling the
// "server-only" guard into the client bundle.

export const MAX_AUTHORS_PER_CARD = 10;
export const MAX_DISPLAY_NAME_LEN = 60;

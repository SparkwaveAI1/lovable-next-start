// GAME platform Twitter worker wiring
// Put the real values in GitHub Actions env (next step).
export const TWITTER_WORKER_ID =
  process.env.TWITTER_WORKER_ID ?? "twitter-poster";       // example default

export const POST_TWEET_FN =
  process.env.POST_TWEET_FN ?? "post_tweet";               // example default
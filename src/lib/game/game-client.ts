// GAME SDK client configuration
// Note: API structure will be updated based on actual SDK documentation

const GAME_API_KEY = process.env.GAME_API_KEY;

if (!GAME_API_KEY) {
  throw new Error("GAME_API_KEY environment variable is required");
}

// Basic configuration for GAME SDK integration
export const gameConfig = {
  apiKey: GAME_API_KEY,
  environment: "production"
};

export { GAME_API_KEY };
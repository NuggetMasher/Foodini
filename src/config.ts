// API configuration - automatically detects environment
const getApiUrl = (): string => {
  // Use environment variable if set (for Docker/deployment)
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }

  // Default to localhost:8000 (works for both development and Docker)
  return "https://foodini-api.tylerhoup.dev";
};

export const API_BASE_URL = getApiUrl();

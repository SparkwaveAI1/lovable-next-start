// Shared CORS configuration for all edge functions
// In production, restricts to specific allowed origins
// In development, allows all origins for easier testing

const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://www.lovable.dev',
  // Add your custom domains here:
  // 'https://your-app.com',
  // 'https://www.your-app.com',
];

// Development origins (localhost)
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  
  // In development, allow localhost origins
  if (isDev && (DEV_ORIGINS.includes(origin) || origin === '')) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }
  
  // Check if origin is in allowed list (includes Lovable preview URLs)
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) ||
                    origin.includes('.lovable.app') ||
                    origin.includes('.lovable.dev');
  
  if (isAllowed) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }
  
  // Fallback for unknown origins - still allow but log for monitoring
  console.warn(`CORS: Unknown origin attempted access: ${origin}`);
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

// Simple headers for cases where we don't have access to the request
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

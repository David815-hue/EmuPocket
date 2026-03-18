module.exports = (request, response) => {
  const payload = {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    supabaseEmail: process.env.SUPABASE_EMAIL || "",
  };

  response.setHeader("Content-Type", "text/javascript; charset=utf-8");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  response.setHeader("Cache-Control", "no-cache");
  response.status(200).send(`window.__APP_CONFIG__ = ${JSON.stringify(payload)};`);
};

type CorsCallback = (error: Error | null, allow?: boolean) => void;

const parseCorsOrigins = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isLocalOrigin = (origin: string) =>
  /^http:\/\/localhost:\d+$/.test(origin) ||
  /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

export const getCorsOptions = () => {
  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

  return {
    origin: (origin: string | undefined, callback: CorsCallback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length > 0) {
        callback(null, allowedOrigins.includes(origin));
        return;
      }
      callback(null, isLocalOrigin(origin));
    },
    credentials: true,
  };
};

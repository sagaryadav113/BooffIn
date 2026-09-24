import { z } from 'zod';

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SUPABASE_URL: z.string().url().optional().default('https://booffin.supabase.co'),
  SUPABASE_ANON_KEY: z.string().optional().default('development-anon-key'),
});

const rawEnv = {
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'development',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

const parsedEnv = envSchema.safeParse(rawEnv);

if (!parsedEnv.success) {
  console.warn(
    '⚠️ [BooffIn Environment Configuration Warning]: Missing or invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors
  );
}

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      APP_ENV: 'development' as const,
      SUPABASE_URL: 'https://booffin.supabase.co',
      SUPABASE_ANON_KEY: 'development-anon-key',
    };

import 'dotenv/config'; // must be first — loads .env before telemetry reads env vars
import './infrastructure/telemetry/setup'; // must be second — patches openai before it loads
import { ZodError } from 'zod';
import { parseEnv } from './env';
import { createApp } from './index';

let env;
try {
  env = parseEnv();
} catch (e) {
  if (e instanceof ZodError) {
    // TODO: replace with structured logger — align with ../../pti-salmoneras/backend/ impl
    const lines = e.errors.map((err) => `  ${err.path.join('.')}: ${err.message}`);
    console.error('Invalid environment variables:\n' + lines.join('\n'));
    process.exit(1);
  }
  throw e;
}

const app = createApp(env);
app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

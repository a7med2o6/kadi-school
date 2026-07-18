import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * The web app lives on {slug}.{base}, one subdomain per tenant, so a static
 * origin list can't work — every school needs its own subdomain accepted.
 * Allows the bare base origin and any single-label subdomain of it.
 */
function buildCorsOriginChecker(bases: string[]) {
  const patterns = bases.map((base) => {
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^https?://([a-z0-9-]+\\.)?${escaped}$`);
  });

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || patterns.some((pattern) => pattern.test(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const corsBases = (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((origin) => {
    // Store just the host[:port] part so subdomains can be pattern-matched against it.
    return origin.trim().replace(/^https?:\/\//, '');
  });
  app.enableCors({
    origin: buildCorsOriginChecker(corsBases),
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Orígenes autorizados a llamar a la API.
 *
 * `enableCors()` sin argumentos permitía cualquier origen. La terminal Electron
 * carga desde `file://`, que viaja sin cabecera Origin, así que las peticiones
 * sin origen se admiten; un navegador cualquiera, no.
 */
const parseAllowedOrigins = (): string[] =>
  (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  const allowedOrigins = parseAllowedOrigins();
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origen no autorizado: ${origin}`));
    },
    credentials: true,
  });

  /* Los controladores declaraban el prefijo a mano y dos de ellos se lo
     olvidaron: `purchases` y `expenses` quedaban fuera de /api/v1 y por tanto
     inalcanzables desde el cliente. Ahora lo pone el marco, una sola vez. */
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Supero POS Central API escuchando en el puerto ${port}`);
  logger.log(`Orígenes CORS autorizados: ${allowedOrigins.join(', ')}`);
}

bootstrap();

import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class EnvVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === ''
      ? undefined
      : parseInt(String(value), 10),
  )
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  PUBLIC_URL?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === ''
      ? undefined
      : parseInt(String(value), 10),
  )
  @IsInt()
  @Min(1)
  MAX_FILE_SIZE_MB?: number;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  publicUrl: string;
  maxFileSizeMb: number;
  databaseUrl: string;
}

export function loadAppConfig(): AppConfig {
  const cors = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    corsOrigins: cors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    publicUrl: (process.env.PUBLIC_URL ?? 'http://localhost:3001').replace(
      /\/$/,
      '',
    ),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10),
    databaseUrl: process.env.DATABASE_URL ?? '',
  };
}

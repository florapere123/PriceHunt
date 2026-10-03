import { InjectionToken, isDevMode } from '@angular/core';

export type AppEnvironment = 'development' | 'production';

export interface AppConfig {
  environment: AppEnvironment;
  api: {
    baseUrl: string;
  };
  features: {
    enablePerformanceMetrics: boolean;
    enableConsoleLogging: boolean;
  };
}

const CONFIGS = {
  development: {
    environment: 'development',
    api: {
      baseUrl: 'http://localhost:5119/api',
    },
    features: {
      enablePerformanceMetrics: true,
      enableConsoleLogging: true,
    },
  },
  production: {
    environment: 'production',
    api: {
      // Same localhost URL as development for this local-only assignment; not a copy-paste oversight.
      baseUrl: 'http://localhost:5119/api',
    },
    features: {
      enablePerformanceMetrics: false,
      enableConsoleLogging: false,
    },
  },
} satisfies Record<AppEnvironment, AppConfig>;

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => CONFIGS[isDevMode() ? 'development' : 'production'],
});

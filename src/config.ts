// prisma-to-zod-generator/src/config.ts
import { GeneratorConfig as PrismaToTsGeneratorConfig } from 'prisma-to-ts-generator';
import { GenerateProps as TsToZodConfig } from 'ts-to-zod';
import { ImportResolutionConfig } from 'dynamic-import-resolution';

/**
 * Configuration for prisma-to-zod-generator.
 */
export interface PrismaToZodConfig {
    /**
     * Paths to Prisma schema files.
     */
    prismaSchemaPaths: string[];

    /**
     * Base output directory for generated TS and Zod files.
     */
    outputBaseDir: string;

    /**
     * Whether to keep the intermediate TS files after Zod schema generation.
     * @default true
     */
    withTs?: boolean;

    /**
     * Configuration passed to prisma-to-ts-generator.
     */
    prismaToTsConfig?: Omit<PrismaToTsGeneratorConfig, 'dirOrFilesPath' | 'outputPath'>;

    /**
     * Configuration passed to ts-to-zod.
     */
    tsToZodConfig?: Omit<TsToZodConfig, 'sourceText'>;

    /**
     * Configuration for dynamic-import-resolution, passed to ts-to-zod.
     */
    dynamicImportResolutionConfig?: ImportResolutionConfig;
}

/**
 * Validates the provided configuration object.
 * @param config The configuration object to validate.
 * @returns The validated configuration object.
 * @throws Error if the configuration is invalid.
 */
export function validateConfig(config: unknown): PrismaToZodConfig {
    if (!config || typeof config !== 'object') {
        throw new Error('PrismaToZodConfig: Configuration must be a non-null object.');
    }

    const prismaConfig = config as PrismaToZodConfig;

    if (!Array.isArray(prismaConfig.prismaSchemaPaths) || prismaConfig.prismaSchemaPaths.length === 0) {
        throw new Error('PrismaToZodConfig: prismaSchemaPaths must be a non-empty array of strings.');
    }
    if (prismaConfig.prismaSchemaPaths.some(path => typeof path !== 'string')) {
        throw new Error('PrismaToZodConfig: Each path in prismaSchemaPaths must be a string.');
    }

    if (typeof prismaConfig.outputBaseDir !== 'string') {
        throw new Error('PrismaToZodConfig: outputBaseDir must be a string.');
    }

    if (prismaConfig.withTs !== undefined && typeof prismaConfig.withTs !== 'boolean') {
        throw new Error('PrismaToZodConfig: withTs, if provided, must be a boolean.');
    }

    if (prismaConfig.prismaToTsConfig !== undefined && typeof prismaConfig.prismaToTsConfig !== 'object') {
        throw new Error('PrismaToZodConfig: prismaToTsConfig, if provided, must be an object.');
    }

    if (prismaConfig.tsToZodConfig !== undefined && typeof prismaConfig.tsToZodConfig !== 'object') {
        throw new Error('PrismaToZodConfig: tsToZodConfig, if provided, must be an object.');
    }

    if (prismaConfig.dynamicImportResolutionConfig !== undefined && typeof prismaConfig.dynamicImportResolutionConfig !== 'object') {
        throw new Error('PrismaToZodConfig: dynamicImportResolutionConfig, if provided, must be an object.');
    }

    return prismaConfig;
}

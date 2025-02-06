// prisma-to-zod-generator/src/orchestrator.ts
import path from 'path';
import { PrismaToZodConfig, validateConfig } from './config';
import { ensureDir, deleteDir } from './directory';
import { generateTypeScriptFromPrisma } from './prisma-to-ts';
import { generateZodFromTypeScript } from './ts-to-zod';

/**
 * Orchestrates the process of generating Zod schemas from Prisma schema files.
 * @param rawConfig Raw configuration object.
 * @returns A Promise that resolves when the entire process is complete.
 * @throws Error if configuration is invalid or any generation step fails.
 */
export const prismaToZod = async (rawConfig: unknown): Promise<void> => {
    let config: PrismaToZodConfig;
    try {
        config = validateConfig(rawConfig);
    } catch (error: any) {
        throw new Error(`OrchestratorError: Configuration validation failed: ${error.message}`);
    }

    const tsOutputDir = path.join(config.outputBaseDir, 'ts');
    const zodOutputDir = path.join(config.outputBaseDir, 'zod');

    try {
        await ensureDir(tsOutputDir);
        await ensureDir(zodOutputDir);

        await generateTypeScriptFromPrisma(config.prismaSchemaPaths, tsOutputDir, config.prismaToTsConfig);
        await generateZodFromTypeScript(tsOutputDir, zodOutputDir, config.tsToZodConfig, config.dynamicImportResolutionConfig);

        if (config.withTs === false) {
            await deleteDir(tsOutputDir).catch(err => console.warn(`OrchestratorWarning: Failed to cleanup TS output directory: ${err.message}`));
        }
    } catch (error: any) {
        // Cleanup directories on failure
        await deleteDir(tsOutputDir).catch(cleanupErr => console.warn(`OrchestratorWarning: Failed to cleanup TS output directory after error: ${cleanupErr.message}`));
        await deleteDir(zodOutputDir).catch(cleanupErr => console.warn(`OrchestratorWarning: Failed to cleanup Zod output directory after error: ${cleanupErr.message}`));
        throw new Error(`OrchestratorError: Prisma to Zod schema generation failed: ${error.message}`);
    }
};

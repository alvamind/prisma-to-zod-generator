// prisma-to-zod-generator/src/prisma-to-ts.ts
import path from 'path';
import { generate as prismaToTsGenerate, GeneratorConfig as PrismaTsGeneratorConfig } from 'prisma-to-ts-generator'; // Correct import here
import { PrismaToZodConfig } from './config'; // Keep this import for PrismaToZodConfig

/**
 * Generates TypeScript files from Prisma schema files using prisma-to-ts-generator.
 * @param prismaSchemaPaths Array of paths to Prisma schema files.
 * @param outputDir The directory where TypeScript files will be generated.
 * @param config Optional configuration object to be passed to prisma-to-ts-generator.
 * @returns A Promise that resolves when TypeScript generation is complete.
 * @throws Error if TypeScript generation fails.
 */
export const generateTypeScriptFromPrisma = async (
    prismaSchemaPaths: string[],
    outputDir: string,
    config?: Omit<PrismaTsGeneratorConfig, 'dirOrFilesPath' | 'outputPath'> // Use the correctly imported type and Omit
): Promise<void> => {
    try {
        await prismaToTsGenerate({
            dirOrFilesPath: prismaSchemaPaths,
            outputPath: outputDir,
            multiFiles: true, // Force multiFiles for better separation
            ...(config || {}), // Spread provided config, overwriting defaults if necessary
        });
    } catch (error: any) {
        throw new Error(`PrismaToTsError: TypeScript generation from Prisma schema failed: ${error.message}`);
    }
};

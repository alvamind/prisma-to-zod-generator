// prisma-to-zod-generator/src/ts-to-zod.ts
import path from 'path';
import fs from 'fs/promises';
import { generate as tsToZodLibGenerate } from 'ts-to-zod';
import { ImportResolutionConfig } from 'dynamic-import-resolution';
import { PrismaToZodConfig } from './config'; // Import config interface for type safety

/**
 * Generates Zod schemas from TypeScript files using ts-to-zod.
 * @param inputDir Directory containing TypeScript files to convert.
 * @param outputDir Directory where Zod schema files will be generated.
 * @param config Optional configuration object to be passed to ts-to-zod.
 * @param dynamicImportResolutionConfig Optional configuration for dynamic import resolution.
 * @returns A Promise that resolves when Zod schema generation is complete.
 * @throws Error if Zod schema generation fails.
 */
export const generateZodFromTypeScript = async (
    inputDir: string,
    outputDir: string,
    config?: PrismaToZodConfig['tsToZodConfig'], // Correct type from config
    dynamicImportResolutionConfig?: PrismaToZodConfig['dynamicImportResolutionConfig'] // Correct type from config
): Promise<void> => {
    try {
        const tsFiles = await fs.readdir(inputDir);

        for (const file of tsFiles) {
            if (file.endsWith('.ts') && !file.endsWith('.d.ts')) { // Process only .ts files, skip declaration files
                const inputFilePath = path.join(inputDir, file);
                const sourceText = await fs.readFile(inputFilePath, 'utf-8');
                const outputFilePath = path.join(outputDir, file.replace('.ts', '.zod.ts')); // Define output path here

                const tsToZodOutput = tsToZodLibGenerate({ // Using programmatic API
                    sourceText,
                    // Pass-through relevant configurations, ensure no override for sourceText
                    ...config, // Correctly pass the tsToZodConfig
                    ...(dynamicImportResolutionConfig ? {
                        ...config, // Ensure tsToZodConfig takes precedence if conflicts
                        dynamicImportResolutionConfig, // Pass dynamicImportResolutionConfig
                        inputOutputMappings: [{ input: inputFilePath, output: outputFilePath }] // Optional, might be needed by ts-to-zod in some scenarios, but not for import resolution itself
                    } : config), // If no dynamicImportResolutionConfig, just pass tsToZodConfig
                });

                if (tsToZodOutput?.errors?.length) {
                    console.warn(`TsToZodWarning: Warnings/Errors during Zod schema generation for ${file}:`, tsToZodOutput.errors); // Log warnings, don't block entirely
                }

                const zodSchemasFileContent = tsToZodOutput?.getZodSchemasFile('./' + file); // Assuming relative import path from zod to ts
                if (zodSchemasFileContent) {
                    await fs.writeFile(outputFilePath, zodSchemasFileContent);
                }
            }
        }

    } catch (error: any) {
        throw new Error(`TsToZodError: Zod schema generation from TypeScript files failed: ${error.message}`);
    }
};

// src/generate-ts.ts
import { generate as tsGenerate } from 'prisma-to-ts-generator';
import { GeneratorConfig } from './config';
import { ensureDir, resolvePath, joinPath } from './file-system';

export const generateTsTypes = async (config: GeneratorConfig): Promise<void> => {
    const { dirOrFilesPath, outputPath, multiFiles, modelVariants } = config;

    console.log('generate-ts.ts: config', config);

    await tsGenerate({
        dirOrFilesPath,
        outputPath,
        multiFiles,
        modelVariants,
    });
};

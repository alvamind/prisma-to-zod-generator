// src/generator.ts
import { GeneratorConfig } from './config';
import { generateTsTypes } from './generate-ts';
import { generateZodSchemas } from './generate-zod';
import { removeDir, resolvePath, joinPath } from './file-system';

export const generate = async (config: GeneratorConfig): Promise<void> => {
    const { outputPath, withTs = true } = config;

    await generateTsTypes({
        ...config,
        outputPath: joinPath(outputPath, 'ts'),
    });

    await generateZodSchemas(config);

    if (!withTs) {
        const tsOutputPath = joinPath(outputPath, 'ts');
        await removeDir(tsOutputPath);
        console.log(`Deleted TS types from: ${tsOutputPath}`);
    }
};

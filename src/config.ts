// src/config.ts
import { GeneratorConfig as TsGeneratorConfig } from 'prisma-to-ts-generator';

export interface GeneratorConfig {
    dirOrFilesPath: string[];
    outputPath: string;
    withTs?: boolean;
    multiFiles?: boolean;
    modelVariants?: TsGeneratorConfig['modelVariants']; // Re-use types from Y
}

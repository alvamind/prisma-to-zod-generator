// // prisma-to-zod-generator/example/index.ts (Corrected and Simplified)
// import { prismaToZod, PrismaToZodConfig } from '../src';
// import path from 'path';

// const config: PrismaToZodConfig = {
//     prismaSchemaPaths: ['./prisma/'], //  Relative path to schema
//     outputBaseDir: './example/generated',  // Final output directory for Zod
//     withTs: true, // Keep the intermediate TS files
//     prismaToTsConfig: {
//         multiFiles: true,
//         modelVariants: ['Regular', 'CreateInput', 'UpdateInput', 'Partial']
//     },
//     // dynamicImportResolutionConfig is optional and not used by ts-to-zod
// };

// prismaToZod(config).catch(console.error);
//
import { generate as prismaToTsGenerate, GeneratorConfig as PrismaTsGeneratorConfig } from 'prisma-to-ts-generator';

await prismaToTsGenerate({
    dirOrFilesPath: ['./prisma/'], // Correct: Use the schema file paths
    outputPath: './example/generated',      // Correct: Use the tsOutputDir
    multiFiles:true,
    modelVariants: ['CreateInput','Partial','Regular','UpdateInput'],
    // ...config // Spread the rest of the provided config (multiFiles, etc.)
});

// test-prisma-zod/src/index.ts
import path from 'path';
import { prismaToZod, PrismaToZodConfig } from '../src';

async function main() {
  const config: PrismaToZodConfig = {
    prismaSchemaPaths: [path.join(__dirname, '..', 'prisma', 'schema.prisma')], // Path to your Prisma schema
    outputBaseDir: path.join(__dirname, '..', 'generated'), // Output directory for TS and Zod
    withTs: true, // Keep generated TS files (for now, for verification)
    dynamicImportResolutionConfig: { // Corrected dynamic import resolution config
      outputStructure: 'nested',
      baseOutputDir: path.join(__dirname, '..', 'generated'), // Correct base output dir: 'generated'
      typeDirMap: { model: 'models', enum: 'enums' },
      fileExtension: '.zod.ts',
      fileNameConvention: 'PascalCase',
      baseSourceDir: path.join(__dirname, '..', 'src'),
    },
  };

  try {
    await prismaToZod(config);
    console.log('Prisma to Zod schema generation completed successfully!');
  } catch (error: any) {
    console.error('Prisma to Zod schema generation failed:', error);
  }
}

main();

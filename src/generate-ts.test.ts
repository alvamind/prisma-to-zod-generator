// src/generate-ts.test.ts
import { describe, it, beforeAll, beforeEach, afterAll, afterEach, expect } from "bun:test";
import { $ } from "bun";
import { generateTsTypes } from "./generate-ts";
import type { GeneratorConfig } from "./config";
import { join } from "path";
import { mkdtempSync, realpathSync } from "fs";
import { tmpdir } from "os";

describe("TypeScript Generator", () => {
  const baseDir = 'coba'
  const prismaTestDir = 'aja/schema.prisma'
  const tsOutputPath = join(baseDir, "generated");

  const testConfig: GeneratorConfig = {
    dirOrFilesPath: [prismaTestDir],
    outputPath: tsOutputPath,
    multiFiles: true,
    modelVariants: ["Regular", "CreateInput"],
  };

  beforeAll(async () => {
    // Create test directory structure
    await $`mkdir -p ${prismaTestDir}`;

    // Create sample Prisma schema
    const prismaContent = `
      model User {
        id    Int     @id @default(autoincrement())
        email String  @unique
        name  String?
      }
    `;
    await Bun.write(join(prismaTestDir, "schema.prisma"), prismaContent);
  });

  beforeEach(async () => {
    // Clean output directory before each test
    await $`rm -rf ${tsOutputPath} && mkdir -p ${tsOutputPath}`;
  });

  afterAll(async () => {
    // Cleanup all test directories
    await $`rm -rf ${baseDir} ${prismaTestDir}`;
  });

  async function getTreeOutput(): Promise<string> {
    return await $`tree ${tsOutputPath} -I 'node_modules|dist|.git'`.text();
  }

  it("should generate single file with types", async () => {
    await generateTsTypes({
      ...testConfig,
      multiFiles: false
    });

    const treeOutput = await getTreeOutput();
    console.log("Single file structure:\n", treeOutput);

    // Check output structure
    expect(treeOutput).toInclude("index.ts");
    expect(treeOutput).not.toInclude("user.model.ts");

    // Check file content
    const generatedContent = await Bun.file(join(tsOutputPath, "index.ts")).text();
    expect(generatedContent).toInclude("export interface User");
    expect(generatedContent).toInclude("export type UserCreateInput");
  });

  it("should generate multi-file structure", async () => {
    await generateTsTypes({
      ...testConfig,
      multiFiles: true
    });

    const treeOutput = await getTreeOutput();
    console.log("Multi-file structure:\n", treeOutput);

    // Check directory structure
    expect(treeOutput).toInclude("User.ts");
    expect(treeOutput).not.toInclude("index.ts");

    // Check model file content
    const modelContent = await Bun.file(join(tsOutputPath, "/model/User.ts")).text();
    expect(modelContent).toInclude("export interface User");
    expect(modelContent).toInclude("export type UserCreateInput");
  });

  it("should throw error for invalid schema path", async () => {
    const invalidConfig: GeneratorConfig = {
      ...testConfig,
      dirOrFilesPath: ["./non-existent-path"]
    };

    expect(async () => await generateTsTypes(invalidConfig)).toThrow();
  });

  it("should handle empty model variants array", async () => {
    await generateTsTypes({
      ...testConfig,
      multiFiles: false,
      modelVariants: []
    });

    const treeOutput = await getTreeOutput();
    console.log("Single file structure:\n", treeOutput);

    const generatedContent = await Bun.file(join(tsOutputPath, "index.ts")).text();
    expect(generatedContent).toMatch('\n');
  });
});

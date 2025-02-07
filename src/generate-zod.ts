// src/generate-zod.ts
import { generate as generateZod } from 'ts-to-zod';
import { resolveImportPath, ImportResolutionConfig } from 'dynamic-import-resolution';
import ts from 'typescript';
import path from 'path';
import { GeneratorConfig } from './config';
import { readFile, writeFile, ensureDir, readdir, joinPath } from './file-system';
import { InputOutputMapping } from 'ts-to-zod/lib/config';

interface ZodGeneratorConfig extends GeneratorConfig {
    importConfig: ImportResolutionConfig;
    tsOutputPath: string;
    zodOutputPath: string;
    schemaRefs: Map<string, string>;
}

const pascalToCamel = (str: string) =>
    str[0]?.toLowerCase() + str.slice(1) || '';

const processImports = (content: string, zodFilePath: string, config: ZodGeneratorConfig) => {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    let hasZodImport = false;

    const transformed = ts.transform(sourceFile, [
        (context) => (rootNode: ts.SourceFile) => {
            const visit = (node: ts.Node): ts.Node => {
                if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
                    const originalPath = node.moduleSpecifier.text;

                    if (originalPath === 'zod') {
                        hasZodImport = true;
                        return node;
                    }

                    const parsedPath = path.parse(originalPath);
                    const targetName = parsedPath.name;

                    const typeMatch = originalPath.match(/\/(model|enum|helper)\//);
                    const targetType = typeMatch?.[1] || 'model';

                    const resolvedPath = resolveImportPath({
                        sourceFilePath: zodFilePath,
                        targetName,
                        targetType,
                        config: config.importConfig,
                    });

                    if (resolvedPath && config.schemaRefs.has(targetName)) {
                        const importPath = path.relative(
                            path.dirname(zodFilePath),
                            resolvedPath
                        ).replace(/\.ts$/, '');

                        return ts.factory.createImportDeclaration(
                            undefined,
                            ts.factory.createImportClause(
                                false,
                                undefined,
                                ts.factory.createNamedImports([
                                    ts.factory.createImportSpecifier(
                                        false,
                                        undefined,
                                        ts.factory.createIdentifier(`${pascalToCamel(targetName)}Schema`)
                                    )
                                ])
                            ),
                            ts.factory.createStringLiteral(importPath)
                        );
                    }
                }
                return ts.visitEachChild(node, visit, context);
            };

            let transformedNode = ts.visitEachChild(rootNode, visit, context);

            if (!hasZodImport) {
                const zodImport = ts.factory.createImportDeclaration(
                    undefined,
                    ts.factory.createImportClause(
                        false,
                        ts.factory.createIdentifier("z"),
                        undefined
                    ),
                    ts.factory.createStringLiteral("zod")
                );
                transformedNode = ts.factory.updateSourceFile(
                    transformedNode,
                    [zodImport, ...transformedNode.statements]
                );
            }

            return transformedNode;
        },
    ]);

    return printer.printNode(
        ts.EmitHint.Unspecified,
        transformed.transformed[0],
        sourceFile
    );
};

/**
 * Builds a map of all exported Zod schemas
 */
const buildZodSchemaRegistry = async (
  zodOutputPath: string
): Promise<Map<string, string>> => {
  const registry = new Map<string, string>();
  const zodFiles = await readFilesRecursively(zodOutputPath);

  for (const file of zodFiles) {
    const content = await readFile(file);
    const schemaExports = content.matchAll(
      /export (const|type|function) (\w+Schema)\b/g
    );

    for (const [, , schemaName] of schemaExports) {
      const normalizedPath = file
        .replace(zodOutputPath, '')
        .replace(/\.zod\.ts$/, '')
        .replace(/\\/g, '/');
      registry.set(schemaName, normalizedPath);
    }
  }

  return registry;
};

/**
 * Replace inline z.any() declarations with proper imports
 */
const fixSchemaImports = async (
    zodOutputPath: string,
    registry: Map<string, string>
): Promise<void> => {
    const zodFiles = await readFilesRecursively(zodOutputPath);

    for (const file of zodFiles) {
        let content = await readFile(file);
        const importMap = new Map<string, Set<string>>();

        // Find all z.any() declarations
        const placeholderRegex = /const (\w+Schema)\s*=\s*z\.any\(\)\s*;\s*\n/g;
        const placeholderMatches = [...content.matchAll(placeholderRegex)];

        // Prepare import statements
        for (const [, schemaName] of placeholderMatches) {
            const schemaPath = registry.get(schemaName);

            if (schemaPath) {
                const targetZodFilePath = path.join(zodOutputPath, schemaPath + '.zod');
                let relativePath = path.relative(path.dirname(file), targetZodFilePath).replace(/\\/g, '/');

                // Prepend './' if in the same directory
                if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
                    relativePath = './' + relativePath;
                }
                // **ADD .zod extension BACK**
                if(!relativePath.endsWith('.zod')){
                    relativePath += '.zod';

                }



                if (!importMap.has(relativePath)) {
                    importMap.set(relativePath, new Set());
                }
                importMap.get(relativePath)?.add(schemaName);
            }
        }

        // Generate import statements
        let imports = '';
        for (const [importPath, schemas] of importMap) {
            const schemaList = [...schemas].join(', ');
            imports += `import { ${schemaList} } from '${importPath}';\n`;
        }

        // Remove placeholder declarations and add imports
        content = content.replace(placeholderRegex, '');
        content = `${imports}\n${content}`;

        await writeFile(file, content);
    }
};



export const convertToZod = async (config: ZodGeneratorConfig) => {
    const tsFiles = await readFilesRecursively(config.tsOutputPath);
    const schemaRefs = new Map<string, string>();

    // First pass: Collect schema references
    for (const tsFile of tsFiles) {
        const content = await readFile(tsFile);
        const sourceFile = ts.createSourceFile(tsFile, content, ts.ScriptTarget.Latest);
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
                schemaRefs.set(node.name.text, tsFile);
            }
        });
    }

    // Prepare input-output mappings
    const inputOutputMappings: InputOutputMapping[] = [{
        input: `${config.tsOutputPath}/**/*.ts`,
        output: `${config.zodOutputPath}/{{DIR}}/{{NAME}}.zod.ts`,
        getSchemaName: (name: string) => `${pascalToCamel(name)}Schema`
    }];

    // Second pass: Generate Zod schemas
    await Promise.all(tsFiles.map(async (tsFile) => {
        if (!tsFile.endsWith('.ts')) return;

        const content = await readFile(tsFile);
        if (!content) return;

        const zodResult = generateZod({
            sourceText: content,
            keepComments: true,
            getSchemaName: (name: string) => `${pascalToCamel(name)}Schema`,
            inputOutputMappings
        });

        if (zodResult.errors.length) {
            console.error(`Zod errors in ${tsFile}:`, zodResult.errors);
            return;
        }

        const zodFile = path.join(
            config.zodOutputPath,
            path.relative(config.tsOutputPath, tsFile)
                .replace(/(\.d)?\.ts$/, '.zod.ts')
                .replace(/(\/|^)[A-Z]/g, match => match.toLowerCase())
        );

        let zodContent = processImports(
            zodResult.getZodSchemasFile('../ts'),
            zodFile,
            { ...config, schemaRefs }
        );

        await ensureDir(path.dirname(zodFile));
        await writeFile(zodFile, zodContent);
    }));

    // New import fixing system
    const registry = await buildZodSchemaRegistry(config.zodOutputPath);
    await fixSchemaImports(config.zodOutputPath, registry);
};

const readFilesRecursively = async (dirPath: string): Promise<string[]> => {
    let files: string[] = [];
    try {
        const entries = await readdir(dirPath);
        for (const entry of entries) {
            const fullPath = joinPath(dirPath, entry);
            const stat = await Bun.file(fullPath).stat();
            stat.isDirectory()
                ? files.push(...await readFilesRecursively(fullPath))
                : files.push(fullPath);
        }
    } catch (error) {
        if ((error as any).code === 'ENOENT') return [];
        throw error;
    }
    return files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
};

export const generateZodSchemas = async (config: GeneratorConfig): Promise<void> => {
    const { outputPath, multiFiles } = config;
    const tsOutputPath = joinPath(outputPath, 'ts');
    const zodOutputPath = joinPath(outputPath, 'zod');

    const importConfig: ImportResolutionConfig = {
        outputStructure: multiFiles ? 'nested' : 'flat',
        baseOutputDir: zodOutputPath,
        fileExtension: '.zod.ts',
        fileNameConvention: 'camelCase',
        typeDirMap: {
            model: 'model',
            enum: 'enum',
            helper: 'helper',
        }
    };

    const zodGeneratorConfig: ZodGeneratorConfig = {
        ...config,
        tsOutputPath,
        zodOutputPath,
        importConfig,
        schemaRefs: new Map(),
    };

    await ensureDir(zodOutputPath);
    await convertToZod(zodGeneratorConfig);
    console.log(`âœ… Zod schemas generated to: ${zodOutputPath}`);
};

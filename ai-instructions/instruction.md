make an npm library named prisma-to-zod-generator as X with main purpose is converting prisma schemas into zod types. follow below instructions;
1. library usage is trough programmatic API below, no CLI at al. use following
```
  await generate({
    dirOrFilesPath: ['./prisma/'],
    outputPath: './src/generated',
    withTs: true, //keep ts types
    multiFiles: true,
    modelVariants: ['Regular', 'CreateInput', 'UpdateInput', 'Partial'],
  });
```
2. the X lib should use another library named prisma-to-ts-generator as Y, and dynamic-import-resolution as Z, and ts-to-zod as W
3. you should learn the Y Z W source codes on .md files
4. the flow should be like this
```
      a. X generate ts folder to {outputPath}/ts using Y,
      b. then X reads {outputPath}/ts and generate zod types to {outputPath}/zod using W and Z.
      c. if withTs false, then x delete {outputPath}/ts after {outputPath}/zod generated
```
5. you should create X in SOLID but Functional programming style separated into files.
6. each SOLID files should have another file with *.test.ts extension for unit tests
7. the *.test.ts files should use bun test with describe, it, beforeAll, beforeEach, afterAll, afterEach.
8. each test cases should be isolated
9. you should create main.test.ts to test X.and to see dir structure on each cases you can use $`tree -I 'node_modules|dist|.git'` import { $ } from "bun";
10. below is source code of number 3



Y------------------------------------------------------
```json prisma-to-ts-generator/package.json
{
  "name": "prisma-to-ts-generator",
  "version": "1.0.7",
  "description": "automatically create TypeScript interfaces and types that mirror your Prisma schema models and enums",
  "type": "module",
  "author": "Alvamind",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/alvamind/prisma-to-ts-generator.git"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5.7.3"
  },
  "dependencies": {
    "@mrleebo/prisma-ast": "^0.12.1",
    "alvamind-tools": "^1.0.23",
    "dynamic-import-resolution": "^1.0.5"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "source": "generate-source output=documentation.md exclude=dist/,node_modules/,.git/",
    "commit": "commit",
    "clean": "clean",
    "split-code": "split-code source=combined.ts markers=src/,lib/ outputDir=./output",
    "publish-npm": "publish-npm patch",
    "patch:apply": "patch -p2 -F3 -b < patch.diff",
    "patch:del-ori": "find . -type f -name \"*.ts.orig\" -delete",
    "patch:undo": "find . -type f -name \"*.ts\" -delete && find . -type f -name \"*.ts.orig\" -exec sh -c 'mv \"$0\" \"$(dirname \"$0\")/$(basename \"$0\" .orig)\"' \\;"
  }
}
```

prisma-to-ts-generator/src
```ts prisma-to-ts-generator/src/ast-processor.ts
// prisma-to-ts-generator/src/ast-processor.ts
import { FieldDef, ModelDef, EnumDef } from './types';

const processField = (p: any): FieldDef => {
    const isPrimaryKey = (p.attributes || []).some((attr: any) => attr.name === 'id');
    const isForeignKey = (p.attributes || []).some((attr: any) => attr.name === 'relation');

    return {
        name: p.name,
        type: typeof p.fieldType === 'string' ? p.fieldType : p.fieldType.name,
        isArray: !!p.array,
        isOptional: !!p.optional || (p.attributes || []).some((attr: any) => attr.name === 'nullable'),
        comment: p.comment,
        isPrimaryKey: isPrimaryKey,
        isForeignKey: isForeignKey,
    };
};

export const processModel = (node: any, isType: boolean): ModelDef => ({
    name: node.name,
    isType,
    comments: (node.comments || []).map((c: any) => c.text),
    fields: (node.properties || [])
        .filter((p: any) => p.type === 'field')
        .map(processField),
});

export const processEnum = (node: any): EnumDef => ({
    name: node.name,
    values: node.enumerators
        .filter((e: any) => e.type === 'enumerator')
        .map((e: any) => e.name),
});
```

```ts prisma-to-ts-generator/src/file-utils.ts
// file-utils.ts
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, promises as fsPromises, existsSync } from 'fs';
import path from 'path';

export const readFile = (filePath: string): string => readFileSync(filePath, 'utf-8');
export const writeFile = (filePath: string, content: string): void => writeFileSync(filePath, content.trim() + '\n');
export const ensureDirExists = (dirPath: string): void => { if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true }); };
export const isDirectory = (filePath: string): boolean => statSync(filePath).isDirectory();
export const getDirFiles = (dirPath: string): string[] => readdirSync(dirPath);
export const getStat = (filePath: string) => statSync(filePath);

export const findFilesByExtension = (dirPath: string, ext: string): string[] => {
    const files = getDirFiles(dirPath);
    return files.reduce<string[]>((acc, file) => {
        const filePath = path.join(dirPath, file);
        if (isDirectory(filePath)) return acc.concat(findFilesByExtension(filePath, ext));
        if (file.endsWith(ext)) return [...acc, filePath];
        return acc;
    }, []);
};

export const findDirectoryByName = async (baseDir: string, dirName: string): Promise<string | null> => {
    try {
        const entries = await fsPromises.readdir(baseDir);
        for (const entry of entries) {
            const fullEntryPath = path.join(baseDir, entry);
            if ((await fsPromises.stat(fullEntryPath)).isDirectory() && entry === dirName) return fullEntryPath;
        }
        return null;
    } catch (error) {
        console.error(`Dir search error '${dirName}' in '${baseDir}': ${error}`);
        return null;
    }
};

export const resolveOutputPath = (outputPath: string): string => path.join(process.cwd(), outputPath);
export const resolveDirPath = (outputPath: string, dirName: string): string => {
    return path.join(outputPath, dirName);
};
```

```ts prisma-to-ts-generator/src/generator.ts
// src/generator.ts
import { getSchema } from '@mrleebo/prisma-ast';
import path from 'path';
import { GeneratorConfig, ModelDef, EnumDef, VariantType } from './types';
import { processModel, processEnum } from './ast-processor';
import { generateEnum, generateModel } from './ts-generator';
import { readFile, findFilesByExtension, ensureDirExists, resolveDirPath, resolveOutputPath, writeFile, isDirectory } from './file-utils';
import { needsHelperTypes } from './type-mapping';

// Embed the content of helper-types.ts directly
const helperTypesContent = `
// @ts-nocheck
import { Prisma } from '@prisma/client';

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;
export const transformJsonNull = (v?: NullableJsonInput) => {
    if (!v || v === 'DbNull') return Prisma.DbNull;
    if (v === 'JsonNull') return Prisma.JsonNull;
    return v;
};
export type JsonValueType = string | number | boolean | null | { [key: string]: JsonValueType | undefined } | JsonValueType[];
export type NullableJsonValueType = JsonValueType | 'DbNull' | 'JsonNull' | null;
export type InputJsonValueType = string | number | boolean | { toJSON: () => unknown } | { [key: string]: InputJsonValueType | null } | (InputJsonValueType | null)[];

export interface DecimalJsLike { d: number[]; e: number; s: number; toFixed(): string; }
export const DECIMAL_STRING_REGEX = /^(?:-?Infinity|NaN|-?(?:0[bB][01]+(?:.[01]+)?(?:[pP][-+]?\\d+)?|0[oO][0-7]+(?:.[0-7]+)?(?:[pP][-+]?\\d+)?|0[xX][\\da-fA-F]+(?:.[\\da-fA-F]+)?(?:[pP][-+]?\\d+)?|(?:\\d+|\\d*\\.\\d+)(?:[eE][-+]?\\d+)?))$/;
export const isValidDecimalInput = (v?: null | string | number | DecimalJsLike): v is string | number | DecimalJsLike => {
    if (v == null) return false;
    return (typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && 'toFixed' in v) || (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) || typeof v === 'number';
};
`;

export const generate = async (config: GeneratorConfig) => {
    const { dirOrFilesPath, outputPath, multiFiles, modelVariants } = config;
    const allModels: ModelDef[] = [];
    const allEnums: EnumDef[] = [];
    const allTypes: ModelDef[] = [];
    const resolvedSchemaPaths: string[] = [];
    let hasHelperTypes = false;

    const outDir = resolveOutputPath(outputPath);
    const resolvedModelDirPath = path.join(outDir, 'model');
    const resolvedEnumDirPath = path.join(outDir, 'enum');
    const resolvedHelperDirPath = path.join(outDir, 'helper');

    dirOrFilesPath.forEach(schemaPath => {
        const resolvedPaths = path.isAbsolute(schemaPath) ? [schemaPath] : [path.join(process.cwd(), schemaPath)];
        resolvedPaths.forEach(p => {
            if (isDirectory(p)) resolvedSchemaPaths.push(...findFilesByExtension(p, '.prisma'));
            else resolvedSchemaPaths.push(p);
        });
    });

    resolvedSchemaPaths.forEach(prismaSchemaPath => {
        const schema = getSchema(readFile(prismaSchemaPath));
        schema.list.forEach((node) => {
            switch (node.type) {
                case 'model': allModels.push(processModel(node, false)); break;
                case 'enum': allEnums.push(processEnum(node)); break;
                case 'type': allTypes.push(processModel(node, true)); break;
            }
        });
    });

    hasHelperTypes = needsHelperTypes(allModels, allTypes);

    if (multiFiles) {
        [resolvedModelDirPath, resolvedEnumDirPath, resolvedHelperDirPath].forEach(ensureDirExists);
        if (hasHelperTypes) writeFile(path.join(resolvedHelperDirPath, 'helper-types.ts'), helperTypesContent); // Use the string constant
    } else {
        ensureDirExists(outDir);
        if (hasHelperTypes) writeFile(path.join(outDir, 'helper-types.ts'), helperTypesContent); // Use the string constant
    }

    let indexContent = '';
    if (hasHelperTypes && !multiFiles) indexContent += `import type { DecimalJsLike, JsonValueType } from './helper-types';\n\n`;

    allEnums.forEach(enumDef => { indexContent += generateEnum(enumDef, outDir, multiFiles, resolvedEnumDirPath); });

    [...allTypes, ...allModels].forEach(model => {
        const variants = (modelVariants || ['Regular']) as VariantType[];
        variants.forEach(variant => {
            indexContent += generateModel(model, allModels, allEnums, allTypes, outDir, multiFiles, hasHelperTypes, variant, modelVariants, resolvedModelDirPath, resolvedEnumDirPath, resolvedHelperDirPath);
        });
    });

    if (!multiFiles) writeFile(path.join(outDir, 'index.ts'), indexContent);
};
```

```ts prisma-to-ts-generator/src/helper-types.ts
// @ts-nocheck
import { Prisma } from '@prisma/client';

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;
export const transformJsonNull = (v?: NullableJsonInput) => {
    if (!v || v === 'DbNull') return Prisma.DbNull;
    if (v === 'JsonNull') return Prisma.JsonNull;
    return v;
};
export type JsonValueType = string | number | boolean | null | { [key: string]: JsonValueType | undefined } | JsonValueType[];
export type NullableJsonValueType = JsonValueType | 'DbNull' | 'JsonNull' | null;
export type InputJsonValueType = string | number | boolean | { toJSON: () => unknown } | { [key: string]: InputJsonValueType | null } | (InputJsonValueType | null)[];

export interface DecimalJsLike { d: number[]; e: number; s: number; toFixed(): string; }
export const DECIMAL_STRING_REGEX = /^(?:-?Infinity|NaN|-?(?:0[bB][01]+(?:.[01]+)?(?:[pP][-+]?\\d+)?|0[oO][0-7]+(?:.[0-7]+)?(?:[pP][-+]?\\d+)?|0[xX][\\da-fA-F]+(?:.[\\da-fA-F]+)?(?:[pP][-+]?\\d+)?|(?:\\d+|\\d*\\.\\d+)(?:[eE][-+]?\\d+)?))$/;
export const isValidDecimalInput = (v?: null | string | number | DecimalJsLike): v is string | number | DecimalJsLike => {
    if (v == null) return false;
    return (typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && 'toFixed' in v) || (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) || typeof v === 'number';
};
```

```ts prisma-to-ts-generator/src/index.ts
// index.ts
export { generate } from './generator';
export * from './types'; // Optionally export types for external use
```

```ts prisma-to-ts-generator/src/ts-generator.ts
// prisma-to-ts-generator/src/ts-generator.ts
import path from 'path';
import { ModelDef, EnumDef, GeneratorConfig, FieldDef, VariantType } from './types';
import { getTsType } from './type-mapping';
import { writeFile, resolveOutputPath } from './file-utils';
import { generateImportStatement, resolveImportPath, ImportResolutionConfig } from 'dynamic-import-resolution'; // Import from dynamic-import-resolution


const generateEnumContent = (enumDef: EnumDef): string =>
    `export type ${enumDef.name} = ${enumDef.values.map(v => `'${v}'`).join(' | ')};\n`;

const generateModelFieldsContent = (
    model: ModelDef, allModels: ModelDef[], enums: EnumDef[], types: ModelDef[],
    imports: Set<string>, multiFiles: boolean, variant: VariantType
): string => {
    const autoGeneratedFields = ['id'];
    const fieldMap: Record<VariantType, (field: FieldDef) => boolean> = {
        'CreateInput': (field: FieldDef) => !field.isPrimaryKey && !autoGeneratedFields.includes(field.name),
        'UpdateInput': (_field: FieldDef) => true,
        'Partial': (_field: FieldDef) => true,
        'Regular': (_field: FieldDef) => true,
    };
    const optionalModifier: Record<VariantType, (field: FieldDef) => string> = {
        'CreateInput': (field: FieldDef) => field.isOptional ? '?' : '',
        'UpdateInput': (_field: FieldDef) => '?',
        'Partial': (_field: FieldDef) => '?',
        'Regular': (field: FieldDef) => field.isOptional ? '?' : '',
    };
    const nullModifier: Record<VariantType, (field: FieldDef) => string> = {
        'CreateInput': (_field: FieldDef) => '',
        'UpdateInput': (_field: FieldDef) => ' | null',
        'Partial': (_field: FieldDef) => '',
        'Regular': (field: FieldDef) => variant !== 'Partial' && field.isOptional ? ' | null' : '',
    };

    return model.fields
        .filter(fieldMap[variant])
        .map(field => {
            let tsType = getTsType(field.type, field, model, allModels, enums, types, imports, multiFiles);
            if (field.isArray) tsType += '[]';
            const optional = optionalModifier[variant](field);
            const nullable = nullModifier[variant](field);
            const commentLine = field.comment ? `  ${field.comment}\n` : '';
            return `${commentLine}  ${field.name}${optional}: ${tsType}${nullable};`;
        }).join('\n');
};

const generateModelVariantContent = (
    model: ModelDef, fieldsContent: string, variant: VariantType, imports: Set<string>,
    multiFiles: boolean, resolvedHelperDirPath: string, modelFilePath: string, resolvedOutputPath: string,
    importResolutionConfig?: ImportResolutionConfig // Optional config
): { content: string, importStatements: string } => {
    let helperImports = '';
    const needsDecimal = model.fields.some(f => f.type === 'Decimal');
    const needsJson = model.fields.some(f => f.type === 'Json');
    const autoGeneratedFields = ['id'];
    let importStatements = '';

    if (multiFiles) {
        const importStatementsArray = Array.from(imports).map(originalImportPath => {
            const [typeDir, importName] = originalImportPath.split('/');

            if (!importResolutionConfig) { // Fallback if config is not provided - existing logic
                let relativePath;
                if (typeDir === 'enum') {
                    relativePath = `../enum/${importName}`;
                } else if (typeDir === 'model') {
                    relativePath = `./${importName}`;
                } else {
                    relativePath = `./${importName}`; // default case, though unlikely
                }
                return `import { ${importName} } from '${relativePath}';`;
            } else { // Use dynamic-import-resolution
                const params = {
                    sourceFilePath: modelFilePath,
                    targetName: importName, // Type name (e.g., ModelName, EnumName)
                    targetType: typeDir,
                    config: importResolutionConfig,
                };
                return generateImportStatement({
                    ...params,
                    statementType: 'javascript-value', // CHANGED THIS LINE
                    namedExports: [importName] // Import the type name
                }) || `// import { ${importName} } from '${`path resolution failed for ${originalImportPath}`}'`; // Fallback comment
            }

        });


        const helperTypesFilePath = path.join(resolvedHelperDirPath, 'helper-types.ts');
        const relativeHelperPath = path.relative(path.dirname(modelFilePath), helperTypesFilePath)
            .replace(/\\/g, '/')
            .replace(/\.ts$/, '');
        helperImports = [
            needsDecimal ? `import { DecimalJsLike } from '${relativeHelperPath.startsWith('.') ? relativeHelperPath : './' + relativeHelperPath}';` : '',
            needsJson ? `import { JsonValueType } from '${relativeHelperPath.startsWith('.') ? relativeHelperPath : './' + relativeHelperPath}';` : '',
        ].filter(Boolean).join('\n');
        importStatements = `${helperImports}\n${importStatementsArray.join('\n')}`;
    }

    const variantName = variant === 'Regular' ? model.name : `${model.name}${variant}`;
    let variantContent = '';
    if (['Partial', 'CreateInput', 'UpdateInput'].includes(variant)) {
        const baseTypeName = model.name;
        const omitFields = "'id'";
        const requiredFields = model.fields.filter(f => !f.isOptional && !autoGeneratedFields.includes(f.name) && !f.isPrimaryKey).map(f => `'${f.name}'`).join(' | ');
        variantContent = `export type ${variantName} = ${
            variant === 'Partial' ? `Partial<${baseTypeName}>`
                : variant === 'CreateInput' ? `Omit<${baseTypeName}, ${omitFields}> ${requiredFields ? `& Required<Pick<${baseTypeName}, ${requiredFields}>>` : ''}`
                    : `Partial<${baseTypeName}>`
            };\n`;
    } else {
        variantContent = `export interface ${variantName} ${fieldsContent ? `{\n${fieldsContent}\n}` : `{}`}\n`;
    }

    return { content: variantContent, importStatements };
};

export const generateModel = (
    model: ModelDef, allModels: ModelDef[], enums: EnumDef[], types: ModelDef[],
    outDir: string, multiFiles: boolean, needsHelperTypes: boolean, variant: VariantType, modelVariants: string[] | undefined,
    resolvedModelDirPath: string, resolvedEnumDirPath: string, resolvedHelperDirPath: string,
    importResolutionConfig?: ImportResolutionConfig // Optional config
): string => {
    const imports = new Set<string>();
    const modelOutputDir = resolvedModelDirPath;
    const modelFilePath = path.join(modelOutputDir, `${model.name}.ts`);
    let content = model.comments?.map(c => `/// ${c}\n`).join('') || '';
    let allVariantsFileContent = '';
    let combinedImportStatements = '';
    const resolvedOutputPath = resolveOutputPath(outDir);

    if (multiFiles) {
        const variantsToGenerate = (modelVariants || ['Regular']) as VariantType[];

        variantsToGenerate.forEach(currentVariant => {
            const fieldsContent = generateModelFieldsContent(model, allModels, enums, types, imports, multiFiles, currentVariant as VariantType);
            const variantGenResult = generateModelVariantContent(model, fieldsContent, currentVariant as VariantType, imports, multiFiles, resolvedHelperDirPath, modelFilePath, resolvedOutputPath, importResolutionConfig); // Pass config
            allVariantsFileContent += variantGenResult.content + '\n';
            combinedImportStatements = variantGenResult.importStatements;
        });

        writeFile(modelFilePath, `${combinedImportStatements.trim() + '\n'}${content}${allVariantsFileContent}`);
        return '';
    }

    const fieldsContent = generateModelFieldsContent(model, allModels, enums, types, imports, multiFiles, variant);
    const variantGenResult = generateModelVariantContent(model, fieldsContent, variant, imports, multiFiles, resolvedHelperDirPath, modelFilePath, resolvedOutputPath, importResolutionConfig); // Pass config
    const variantContent = variantGenResult.content;
    return `${content}${variantContent}`;
};

export const generateEnum = (
    enumDef: EnumDef, outDir: string, multiFiles: boolean, resolvedEnumDirPath: string,
    importResolutionConfig?: ImportResolutionConfig // Optional config
): string => {
    const content = generateEnumContent(enumDef);
    if (multiFiles) {
        const enumOutputDir = resolvedEnumDirPath;
        const enumFilePath = path.join(enumOutputDir, `${enumDef.name}.ts`);
        writeFile(enumFilePath, content);
        return '';
    }
    return content;
};
```

```ts prisma-to-ts-generator/src/type-mapping.ts
// type-mapping.ts
import { FieldDef, ModelDef, EnumDef } from './types';

export const typeMap: Record<string, string> = {
    String: 'string', Decimal: 'DecimalJsLike', Int: 'number', Float: 'number',
    Boolean: 'boolean', DateTime: 'Date', Json: 'JsonValueType', Bytes: 'Buffer', BigInt: 'bigint',
};

export const getTsType = (
    type: string, field: FieldDef, currModel: ModelDef, allModels: ModelDef[],
    enums: EnumDef[], types: ModelDef[], imports: Set<string>, multiFiles: boolean
): string => {
    const cleanType = type.replace('[]', '');
    if (typeMap[cleanType]) return typeMap[cleanType];
    if (enums.some(e => e.name === cleanType)) { if (multiFiles) imports.add(`enum/${cleanType}`); return cleanType; }
    if (allModels.some(m => m.name === cleanType && !m.isType) || types.some(t => t.name === cleanType)) {
        if (multiFiles && cleanType.trim().toLowerCase() !== currModel.name.trim().toLowerCase()) imports.add(`model/${cleanType}`);
        return cleanType;
    }
    return 'string';
};

export const needsHelperTypes = (models: ModelDef[], types: ModelDef[]): boolean =>
    [...models, ...types].some(model => model.fields.some(f => f.type === 'Decimal' || f.type === 'Json'));
```

```ts prisma-to-ts-generator/src/types.ts
// prisma-to-ts-generator/src/types.ts
import { ImportResolutionConfig } from 'dynamic-import-resolution';

export interface FieldDef {
    name: string;
    type: string;
    isArray: boolean;
    isOptional: boolean;
    comment?: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
}
export interface ModelDef { name: string; fields: FieldDef[]; isType: boolean; comments: string[]; }
export interface EnumDef { name: string; values: string[]; }
export type VariantType = 'CreateInput' | 'UpdateInput' | 'Partial' | 'Regular';
export interface GeneratorConfig {
    dirOrFilesPath: string[];
    outputPath: string;
    multiFiles: boolean;
    modelVariants?: VariantType[];
    importResolutionConfig?: ImportResolutionConfig; // Add import resolution config
}
```



z----------------------------------------------------


```json dynamic-import-resolution/package.json
{
  "name": "dynamic-import-resolution",
  "version": "1.0.5",
  "description": "Dynamically resolves import paths and generates import statements for JavaScript and TypeScript projects. Supports ES Modules, CommonJS, and custom configurations.",
  "type": "module",
  "author": "Alvamind",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/alvamind/dynamic-import-resolution.git"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^22.13.1"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "alvamind-tools": "^1.0.23"
  },
  "scripts": {
    "build": "rm -rf dist && tsc -p tsconfig.build.json",
    "source": "generate-source output=documentation.md exclude=dist/,node_modules/,.git/",
    "commit": "commit",
    "clean": "clean",
    "split-code": "split-code source=combined.ts markers=src/,lib/ outputDir=./output",
    "patch:apply": "patch -p2 -F3 -b < patch.diff",
    "patch:del-ori": "find . -type f -name \"*.ts.orig\" -delete",
    "patch:undo": "find . -type f -name \"*.ts\" -delete && find . -type f -name \"*.ts.orig\" -exec sh -c 'mv \"$0\" \"$(dirname \"$0\")/$(basename \"$0\" .orig)\"' \\;"
  }
}
```

dynamic-import-resolution/src
```ts dynamic-import-resolution/src/index.ts
// dynamic-import-resolution/src/index.ts
export {
    resolveImportPath,
    generateImportStatement,
    ImportResolutionConfig,
    ResolveImportPathParams,
    GenerateImportStatementParams
} from './main';
```

```ts dynamic-import-resolution/src/main.ts
import path from 'path';

/**
 * Configuration interface for import resolution.
 */
export interface ImportResolutionConfig {
    /**
     * Defines the structure of the output directories.
     * Examples: 'nested', 'flat', 'by-type', 'custom'
     * If 'custom', you must provide a `customPathPattern`.
     * 'nested':  Uses typeDirMap to create nested directories (e.g., models/User.ts, enums/OrderStatus.ts).
     * 'by-type': Similar to 'nested', but might have a different root.
     * 'flat': All files in the baseOutputDir, no subdirectories.
     */
    outputStructure: 'nested' | 'flat' | 'by-type' | 'custom';

    /**
     *  Mapping of target types (e.g., 'model', 'enum', 'schema') to their output directories
     *  Used when outputStructure is 'by-type' or 'nested'.
     *  Example: { model: 'models', enum: 'enums', schema: 'schemas' }
     */
    typeDirMap?: Record<string, string>;

    /**
     * File extension to use for generated files.
     * Example: '.ts', '.js', '.zod.ts', '.graphql'
     */
    fileExtension: string;

    /**
     * Base directory where all generated files are located.
     * Used as the root for resolving relative paths.
     */
    baseOutputDir: string;

    /**
     * Function to generate a custom path for a target file.
     * Takes target type and name as input, returns the full file path relative to baseOutputDir.
     * Only used if outputStructure is 'custom'.
     */
    customPathPattern?: (targetType: string, targetName: string) => string;

    /**
     * Naming convention for generated files.
     * Examples: 'PascalCase', 'camelCase', 'kebab-case', 'snake_case'
     * Could be a function for more complex logic.  Currently only supports string options.
     * 'PascalCase', 'camelCase', 'kebab-case', 'snake_case', 'lowerCase'
     */
    fileNameConvention?: 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case' | 'lowerCase';

    /**
     *  Optional:  Directory where source files are located, if different from process.cwd() or baseOutputDir.
     *  Used as the base for resolving relative paths *from* the source file.
     *  Defaults to process.cwd() if not provided.
     */
    baseSourceDir?: string;
}

export interface ResolveImportPathParams {
    /** Path to the file where the import statement will be placed (source file). */
    sourceFilePath: string;

    /** Name of the target module/file to import (e.g., 'User', 'OrderStatus'). */
    targetName: string;

    /** Type of the target module (e.g., 'model', 'enum', 'schema', 'component'). */
    targetType: string;

    /** Configuration object for import resolution. */
    config: ImportResolutionConfig;
}

/**
 * Resolves the relative import path from the source file to the target file.
 * @param params Parameters for import path resolution.
 * @returns The relative import path as a string (e.g., './models/User', '../enums/OrderStatus.zod').
 *          Returns null if path cannot be resolved.
 */
export function resolveImportPath(params: ResolveImportPathParams): string | null {
    const { sourceFilePath, targetName, targetType, config } = params;
    const { baseOutputDir, outputStructure, typeDirMap, fileExtension, customPathPattern, fileNameConvention, baseSourceDir } = config;

    const sourceDir = baseSourceDir || process.cwd();

    let targetFilePathWithinBaseDir: string | null = null; // Initialize as null

    const applyNameConvention = (name: string, convention: ImportResolutionConfig['fileNameConvention']): string => {
        if (!convention) return name;
        switch (convention) {
            case 'PascalCase': return name.charAt(0).toUpperCase() + name.slice(1);
            case 'camelCase': return name.charAt(0).toLowerCase() + name.slice(1);
            case 'kebab-case': return name.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            case 'snake_case': return name.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toLowerCase();
            case 'lowerCase': return name.toLowerCase();
            default: return name;
        }
    };

    const formattedTargetName = applyNameConvention(targetName, fileNameConvention);

    if (outputStructure === 'custom') {
        if (customPathPattern) {
            targetFilePathWithinBaseDir = customPathPattern(targetType, formattedTargetName);
        } else {
            console.warn(`outputStructure is 'custom', but customPathPattern is undefined. Returning null.`);
            return null; // Explicitly return null if customPathPattern is missing
        }
    } else if (outputStructure === 'nested' || outputStructure === 'by-type') {
        const typeDir = typeDirMap?.[targetType] || targetType + 's';
        targetFilePathWithinBaseDir = path.join(typeDir, `${formattedTargetName}${fileExtension}`);
    } else if (outputStructure === 'flat') {
        targetFilePathWithinBaseDir = `${formattedTargetName}${fileExtension}`;
    } else {
        console.warn(`Unknown outputStructure: ${outputStructure}. Returning null.`);
        return null; // Return null for unknown structures
    }


    if (!targetFilePathWithinBaseDir) {
        return null; // Should not happen, but for safety
    }

    const absoluteTargetFilePath = path.join(baseOutputDir, targetFilePathWithinBaseDir);
    const absoluteSourceFilePath = path.resolve(sourceDir, sourceFilePath);

    try {
        const relativePath = path.relative(path.dirname(absoluteSourceFilePath), absoluteTargetFilePath);
        if (!relativePath.startsWith('.') && !relativePath.startsWith('..')) {
            return './' + relativePath;
        }
        return relativePath.replace(/\\/g, '/');
    } catch (error) {
        console.error(`Error resolving import path from ${sourceFilePath} to ${targetName} (${targetType}):`, error);
        return null;
    }
}


export interface GenerateImportStatementParams extends ResolveImportPathParams {
    /**
     * Type of import statement to generate.
     * Examples: 'typescript-type', 'javascript-value', 'commonjs-require'
     */
    statementType: 'typescript-type' | 'javascript-value' | 'commonjs-require';

    /**
     *  Optional:  Specific named exports to import (if applicable to the statement type).
     *  Example: ['User', 'UserSchema']
     */
    namedExports?: string[];

    /**
     *  Optional: Default export name (if applicable to the statement type).
     */
    defaultExportName?: string;
}


/**
 * Generates a complete import statement string based on the resolved path and statement type.
 * @param params Parameters for generating the import statement.
 * @returns The complete import statement string (e.g., "import type { User } from './models/User';").
 *          Returns null if statement generation fails.
 */
export function generateImportStatement(params: GenerateImportStatementParams): string | null {
    const { statementType, namedExports, defaultExportName, ...resolvePathParams } = params;
    const resolvedPath = resolveImportPath(resolvePathParams);

    if (!resolvedPath) {
        return null;
    }

    switch (statementType) {
        case 'typescript-type': {
            const exports = namedExports ? `{ ${namedExports.join(', ')} }` : (defaultExportName ? defaultExportName : '*');
            return `import type ${exports} from '${resolvedPath}';`;
        }
        case 'javascript-value': {
            const exports = namedExports ? `{ ${namedExports.join(', ')} }` : (defaultExportName ? defaultExportName : '*');
            return `import ${exports} from '${resolvedPath}';`;
        }
        case 'commonjs-require': {
            if (defaultExportName) {
                return `const ${defaultExportName} = require('${resolvedPath}');`;
            } else if (namedExports) {
                return `const { ${namedExports.join(', ')} } = require('${resolvedPath}');`;
            } else {
                return `const module = require('${resolvedPath}');`;
            }
        }
        default:
            console.warn(`Unknown statementType: ${statementType}.`);
            return null;
    }
}
```



W-------------------------



import { camel } from "case";
import { getJsDoc } from "tsutils";
import ts from "typescript";
import {
  InputOutputMapping,
  JSDocTagFilter,
  NameFilter,
  CustomJSDocFormatTypes,
} from "../config";
import { getSimplifiedJsDocTags } from "../utils/getSimplifiedJsDocTags";
import { resolveModules } from "../utils/resolveModules";
import {
  getReferencedTypeNames,
  isTypeNode,
  TypeNameReference,
  TypeNode,
} from "../utils/traverseTypes";

import {
  getImportIdentifiers,
  createImportNode,
  ImportIdentifier,
  getSingleImportIdentierForNode,
} from "../utils/importHandling";

import { generateIntegrationTests } from "./generateIntegrationTests";
import { generateZodInferredType } from "./generateZodInferredType";
import {
  generateZodSchemaVariableStatement,
  generateZodSchemaVariableStatementForImport,
} from "./generateZodSchema";
import { transformRecursiveSchema } from "./transformRecursiveSchema";
import { areImportPathsEqualIgnoringExtension } from "../utils/getImportPath";

const DEFAULT_GET_SCHEMA = (id: string) => camel(id) + "Schema";

export interface GenerateProps {
  /**
   * Content of the typescript source file.
   */
  sourceText: string;

  /**
   * Filter on type/interface name.
   */
  nameFilter?: NameFilter;

  /**
   * Filter on JSDocTag.
   */
  jsDocTagFilter?: JSDocTagFilter;

  /**
   * Schema name generator.
   */
  getSchemaName?: (identifier: string) => string;

  /**
   * Keep parameters comments.
   * @default false
   */
  keepComments?: boolean;

  /**
   * Skip the creation of zod validators from JSDoc annotations
   *
   * @default false
   */
  skipParseJSDoc?: boolean;

  /**
   * Path of z.infer<> types file.
   */
  inferredTypes?: string;
  /**
   * Custom JSDoc format types.
   */
  customJSDocFormatTypes?: CustomJSDocFormatTypes;

  /**
   * Map of input/output from config that can
   * be used to automatically handle imports
   */
  inputOutputMappings?: InputOutputMapping[];
}

/**
 * Generate zod schemas and integration tests from a typescript file.
 *
 * This function takes care of the sorting of the `const` declarations and solves potential circular references
 */
export function generate({
  sourceText,
  nameFilter = () => true,
  jsDocTagFilter = () => true,
  getSchemaName = DEFAULT_GET_SCHEMA,
  keepComments = false,
  skipParseJSDoc = false,
  customJSDocFormatTypes = {},
  inputOutputMappings = [],
}: GenerateProps) {
  // Create a source file and deal with modules
  const sourceFile = resolveModules(sourceText);

  // Extract the nodes (interface declarations & type aliases)
  const nodes: Array<TypeNode> = [];

  // declare a map to store the interface name and its corresponding zod schema
  const typeNameMapping = new Map<string, TypeNode | ts.ImportDeclaration>();

  /**
   * Following const are keeping track of all the things import-related
   */
  // All import nodes in the source file
  const zodImportNodes: ts.ImportDeclaration[] = [];

  // Keep track of all the external import names available in the source file
  const externalImportNamesAvailable = new Set<string>();

  // Keep track of all the imports that have an entry in the config file
  const importedZodNamesAvailable = new Map<string, string>();

  // Keep track of all referenced types in the source file
  const candidateTypesToBeExtracted = new Set<TypeNameReference>();

  const typeNameMapBuilder = (node: ts.Node) => {
    if (isTypeNode(node)) {
      typeNameMapping.set(node.name.text, node);
      return;
    }

    if (ts.isImportDeclaration(node) && node.importClause) {
      const identifiers = getImportIdentifiers(node);
      identifiers.forEach(({ name }) => typeNameMapping.set(name, node));

      // Check if we're importing from a mapped file
      const eligibleMapping = inputOutputMappings.find(
        (io: InputOutputMapping) =>
          areImportPathsEqualIgnoringExtension(
            io.input,
            (node.moduleSpecifier as ts.StringLiteral).text
          )
      );

      if (eligibleMapping) {
        const schemaMethod =
          eligibleMapping.getSchemaName || DEFAULT_GET_SCHEMA;

        identifiers.forEach(({ name }) =>
          importedZodNamesAvailable.set(name, schemaMethod(name))
        );

        const zodImportNode = createImportNode(
          identifiers.map(({ name, original }) => {
            return {
              name: schemaMethod(name),
              original: original ? schemaMethod(original) : undefined,
            };
          }),
          eligibleMapping.output
        );
        zodImportNodes.push(zodImportNode);
      }
      // Not a Zod import, handling it as 3rd party import later on
      else {
        identifiers.forEach(({ name }) =>
          externalImportNamesAvailable.add(name)
        );
      }
    }
  };

  ts.forEachChild(sourceFile, typeNameMapBuilder);
  const visitor = (node: ts.Node) => {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const jsDoc = getJsDoc(node, sourceFile);
      const tags = getSimplifiedJsDocTags(jsDoc);
      if (!jsDocTagFilter(tags)) return;
      if (!nameFilter(node.name.text)) return;

      const typeNames = getReferencedTypeNames(node, sourceFile);
      typeNames.forEach((typeRef) => {
        candidateTypesToBeExtracted.add(typeRef);
      });
    }
  };
  ts.forEachChild(sourceFile, visitor);

  // All external import names actually used in the source file
  const importNamesUsed: string[] = [];

  // All zod imports actually used in the source file
  const importedZodSchemas = new Set<string>();

  // All original import to keep in the target
  const importsToKeep = new Map<ts.ImportDeclaration, ImportIdentifier[]>();

  /**
   * We browse all the extracted type references from the source file
   * To check if they reference a node from the file or if they are imported
   */
  candidateTypesToBeExtracted.forEach((typeRef) => {
    const node = typeNameMapping.get(typeRef.name);

    if (node) {
      // If we have a reference in the file, we add it to the nodes, no import needed
      if (isTypeNode(node)) {
        nodes.push(node);
        return;
      }

      // If the reference is part of a qualified name, we need to import it from the same file
      if (typeRef.partOfQualifiedName) {
        const identifiers = importsToKeep.get(node);
        const importIdentifier = getSingleImportIdentierForNode(
          node,
          typeRef.name
        );
        if (!importIdentifier) return;
        if (identifiers) {
          identifiers.push(importIdentifier);
        } else {
          importsToKeep.set(node, [importIdentifier]);
        }
        return;
      }
    }

    // If the reference is coming from an external import, we'll need to generate a specific statement
    // and keep the external import
    if (externalImportNamesAvailable.has(typeRef.name)) {
      importNamesUsed.push(typeRef.name);
      return;
    }

    // If the reference is coming from a mapped import, we'll import the corresponding zod schema
    if (importedZodNamesAvailable.has(typeRef.name)) {
      importedZodSchemas.add(
        importedZodNamesAvailable.get(typeRef.name) as string
      );
      return;
    }
  });

  // Generate zod schemas for type nodes
  const getDependencyName = (identifierName: string) => {
    if (importedZodNamesAvailable.has(identifierName)) {
      return importedZodNamesAvailable.get(identifierName) as string;
    }
    return getSchemaName(identifierName);
  };

  const zodTypeSchemas = nodes.map((node) => {
    const typeName = node.name.text;
    const varName = getSchemaName(typeName);
    const zodSchema = generateZodSchemaVariableStatement({
      zodImportValue: "z",
      node,
      sourceFile,
      varName,
      getDependencyName: getDependencyName,
      skipParseJSDoc,
      customJSDocFormatTypes,
    });

    return { typeName, varName, ...zodSchema };
  });

  // Generate zod schemas for 3rd party imports
  const zodImportSchemas = importNamesUsed.map((importName) => {
    const varName = getSchemaName(importName);
    return {
      dependencies: [],
      statement: generateZodSchemaVariableStatementForImport({
        varName,
        zodImportValue: "z",
      }),
      enumImport: false,
      typeName: importName,
      varName,
    };
  });

  const zodSchemas = zodTypeSchemas.concat(zodImportSchemas);
  const zodSchemaNames = zodSchemas.map(({ varName }) => varName);

  // Resolves statements order
  // A schema can't be declared if all the referenced schemas used inside this one are not previously declared.
  const statements = new Map<
    string,
    { typeName: string; value: ts.VariableStatement }
  >();

  // Keep track of types/enums which need to be imported from the source file
  const sourceTypeImports: Set<string> = new Set();
  const sourceEnumImports: Set<string> = new Set();

  // Zod schemas with direct or indirect dependencies that are not in `zodSchemas`, won't be generated
  const zodSchemasWithMissingDependencies = new Set<string>();

  let done = false;
  // Loop until no more schemas can be generated and no more schemas with direct or indirect missing dependencies are found
  while (
    !done &&
    statements.size + zodSchemasWithMissingDependencies.size !==
      zodSchemas.length
  ) {
    done = true;
    zodSchemas
      .filter(
        ({ varName }) =>
          !statements.has(varName) &&
          !zodSchemasWithMissingDependencies.has(varName)
      )
      .forEach(({ varName, dependencies, statement, typeName, enumImport }) => {
        const isCircular = dependencies.includes(varName);
        const notGeneratedDependencies = dependencies
          .filter((dep) => dep !== varName)
          .filter((dep) => !statements.has(dep))
          .filter((dep) => !importedZodSchemas.has(dep));
        if (notGeneratedDependencies.length === 0) {
          done = false;
          if (isCircular) {
            sourceTypeImports.add(typeName);
            statements.set(varName, {
              value: transformRecursiveSchema("z", statement, typeName),
              typeName,
            });
          } else {
            if (enumImport) {
              sourceEnumImports.add(typeName);
            }
            statements.set(varName, { value: statement, typeName });
          }
        } else if (
          // Check if every dependency is (in `zodSchemas` and not in `zodSchemasWithMissingDependencies`)
          !notGeneratedDependencies.every(
            (dep) =>
              zodSchemaNames.includes(dep) &&
              !zodSchemasWithMissingDependencies.has(dep)
          )
        ) {
          done = false;
          zodSchemasWithMissingDependencies.add(varName);
        }
      });
  }

  // Generate remaining schemas, which have circular dependencies with loop of length > 1 like: A->B—>C->A
  zodSchemas
    .filter(
      ({ varName }) =>
        !statements.has(varName) &&
        !zodSchemasWithMissingDependencies.has(varName)
    )
    .forEach(({ varName, statement, typeName }) => {
      sourceTypeImports.add(typeName);
      statements.set(varName, {
        value: transformRecursiveSchema("z", statement, typeName),
        typeName,
      });
    });

  // Warn the user of possible not resolvable loops
  const errors: string[] = [];

  if (zodSchemasWithMissingDependencies.size > 0) {
    errors.push(
      `Some schemas can't be generated due to direct or indirect missing dependencies:
${Array.from(zodSchemasWithMissingDependencies).join("\n")}`
    );
  }

  // Create output files (zod schemas & integration tests)
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: !keepComments,
  });

  const printerWithComments = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  const transformedSourceText = printerWithComments.printFile(sourceFile);

  const zodImportToOutput = zodImportNodes.filter((node) => {
    const nodeIdentifiers = getImportIdentifiers(node);
    return nodeIdentifiers.some(({ name }) => importedZodSchemas.has(name));
  });

  const originalImportsToOutput = Array.from(importsToKeep.keys()).map((node) =>
    createImportNode(
      importsToKeep.get(node)!,
      (node.moduleSpecifier as ts.StringLiteral).text
    )
  );

  const sourceTypeImportsValues = [
    ...sourceTypeImports.values(),
    ...sourceEnumImports.values(),
  ].map((name) => {
    return sourceEnumImports.has(name)
      ? name // enum import, no type notation added
      : `type ${name}`;
  });

  const getZodSchemasFile = (
    typesImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";
${
  sourceTypeImportsValues.length
    ? `import { ${sourceTypeImportsValues.join(
        ", "
      )} } from "${typesImportPath}";\n`
    : ""
}
${
  zodImportToOutput.length
    ? zodImportToOutput.map((node) => print(node)).join("\n") + "\n\n"
    : ""
}${
    originalImportsToOutput.length
      ? originalImportsToOutput.map((node) => print(node)).join("\n") + "\n\n"
      : ""
  }${Array.from(statements.values())
    .map((statement) => print(statement.value))
    .join("\n\n")}
`;

  const testCases = generateIntegrationTests(
    Array.from(statements.values())
      .filter(isExported)
      .map((i) => ({
        zodType: `${getSchemaName(i.typeName)}InferredType`,
        tsType: `spec.${i.typeName}`,
      }))
  );

  const getIntegrationTestFile = (
    typesImportPath: string,
    zodSchemasImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";

import * as spec from "${typesImportPath}";
import * as generated from "${zodSchemasImportPath}";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expectType<T>(_: T) {
  /* noop */
}

${Array.from(statements.values())
  .filter(isExported)
  .map((statement) => {
    // Generate z.infer<>
    const zodInferredSchema = generateZodInferredType({
      aliasName: `${getSchemaName(statement.typeName)}InferredType`,
      zodConstName: `generated.${getSchemaName(statement.typeName)}`,
      zodImportValue: "z",
    });

    return print(zodInferredSchema);
  })
  .join("\n\n")}

${testCases.map(print).join("\n")}
`;

  const getInferredTypes = (
    zodSchemasImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";

import * as generated from "${zodSchemasImportPath}";

${Array.from(statements.values())
  .filter(isExported)
  .map((statement) => {
    const zodInferredSchema = generateZodInferredType({
      aliasName: statement.typeName,
      zodConstName: `generated.${getSchemaName(statement.typeName)}`,
      zodImportValue: "z",
    });

    return print(zodInferredSchema);
  })
  .join("\n\n")}
`;

  return {
    /**
     * Source text with pre-process applied.
     */
    transformedSourceText,

    /**
     * Get the content of the zod schemas file.
     *
     * @param typesImportPath Relative path of the source file
     */
    getZodSchemasFile,

    /**
     * Get the content of the integration tests file.
     *
     * @param typesImportPath Relative path of the source file
     * @param zodSchemasImportPath Relative path of the zod schemas file
     */
    getIntegrationTestFile,

    /**
     * Get the content of the zod inferred types files.
     *
     * @param zodSchemasImportPath Relative path of the zod schemas file
     */
    getInferredTypes,

    /**
     * List of generation errors.
     */
    errors,

    /**
     * `true` if zodSchemaFile have some resolvable circular dependencies
     */
    hasCircularDependencies: sourceTypeImportsValues.length > 0,
  };
}

/**
 * Helper to filter exported const declaration
 * @param i
 * @returns
 */
const isExported = (i: { typeName: string; value: ts.VariableStatement }) =>
  i.value.modifiers?.find((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);

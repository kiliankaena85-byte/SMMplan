import re, os, sys

schema_path = sys.argv[1] if len(sys.argv) > 1 else 'prisma/schema.prisma'
out_dir = sys.argv[2] if len(sys.argv) > 2 else 'node_modules/.prisma/client'
src = open(schema_path, encoding='utf-8').read()
src = re.sub(r'//[^\n]*', '', src)


def blocks(kind):
    out = {}
    for m in re.finditer(r'\n%s (\w+) \{([\s\S]*?)\n\}' % kind, src):
        out[m.group(1)] = m.group(2)
    return out


models = blocks('model')
enums = {}
for name, body in blocks('enum').items():
    members = [l.strip().split()[0] for l in body.splitlines() if l.strip() and not l.strip().startswith('@@')]
    enums[name] = members

scalars = {'String': 'string', 'Int': 'number', 'BigInt': 'bigint', 'Float': 'number', 'Boolean': 'boolean',
           'DateTime': 'Date', 'Json': 'any', 'Decimal': 'Decimal', 'Bytes': 'Uint8Array', 'Unsupported': 'any'}

model_fields = {}
for name, body in models.items():
    fields = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith('@@') or line.startswith('@'):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        fname, ftype = parts[0], parts[1]
        arr = ftype.endswith('[]')
        opt = ftype.endswith('?')
        base = ftype.rstrip('[]?')
        fields.append((fname, base, arr, opt))
    model_fields[name] = fields


def ts_type(base, arr, opt):
    if base in models:
        t = base + 'Model'
    elif base in enums:
        t = base + 'Enum'
    elif base in scalars:
        t = scalars[base]
    else:
        t = 'any'
    if arr:
        return t + '[]'
    return t + (' | null' if opt else '')


L = []
L.append('// AUTO-GENERATED TYPE STUB for offline typecheck (Prisma engine binaries unreachable).')
L.append('// Source of truth: prisma/schema.prisma (model shapes accurate; query args typed loosely).')
L.append('')
for name, members in enums.items():
    union = ' | '.join("'%s'" % m for m in members) or 'string'
    L.append('export type %sEnum = %s;' % (name, union))
    L.append('export type %s = %s;' % (name, union))
    L.append('export declare const %s: { %s };' % (name, '; '.join("%s: '%s'" % (m, m) for m in members)))
L.append('')
for name, fields in model_fields.items():
    L.append('export interface %sModel {' % name)
    for fname, base, arr, opt in fields:
        L.append('  %s: %s;' % (fname, ts_type(base, arr, opt)))
    L.append('}')
L.append('')
for name in model_fields:
    L.append('export type %s = %sModel;' % (name, name))
L.append('')
L.append('export declare class Decimal { toString(): string; toNumber(): number; toFixed(n?: number): string; valueOf(): number; plus(o: any): Decimal; minus(o: any): Decimal; mul(o: any): Decimal; div(o: any): Decimal; [k: string]: any; }')
L.append('export declare const DbNull: any; export declare const JsonNull: any; export declare const AnyNull: any;')
L.append('')
L.append('export declare class PrismaClientKnownRequestError extends Error { code: string; meta?: any; clientVersion: string; }')
L.append('export declare class PrismaClientValidationError extends Error {}')
L.append('export declare class PrismaClientInitializationError extends Error {}')
L.append('export declare class PrismaClientRustPanicError extends Error {}')
L.append('export type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;')
L.append('')
L.append('export declare class PrismaClient {')
L.append('  constructor(options?: any);')
for name in model_fields:
    d = name[0].lower() + name[1:]
    M = name + 'Model'
    L.append('  %s: {' % d)
    L.append('    findMany<T = %s>(args?: any): Promise<T[]>;' % M)
    L.append('    findFirst<T = %s>(args?: any): Promise<T | null>;' % M)
    L.append('    findFirstOrThrow<T = %s>(args?: any): Promise<T>;' % M)
    L.append('    findUnique<T = %s>(args?: any): Promise<T | null>;' % M)
    L.append('    findUniqueOrThrow<T = %s>(args?: any): Promise<T>;' % M)
    L.append('    create(args?: any): Promise<%s>;' % M)
    L.append('    createMany(args?: any): Promise<{ count: number }>;')
    L.append('    update(args?: any): Promise<%s>;' % M)
    L.append('    updateMany(args?: any): Promise<{ count: number }>;')
    L.append('    upsert(args?: any): Promise<%s>;' % M)
    L.append('    delete(args?: any): Promise<%s>;' % M)
    L.append('    deleteMany(args?: any): Promise<{ count: number }>;')
    L.append('    count(args?: any): Promise<number>;')
    L.append('    aggregate(args?: any): Promise<any>;')
    L.append('    groupBy(args?: any): Promise<any[]>;')
    L.append('    fields: any;')
    L.append('  };')
L.append('  $transaction<T>(fn: (tx: TransactionClient) => Promise<T>, opts?: any): Promise<T>;')
L.append('  $transaction(promises: Promise<any>[]): Promise<any[]>;')
L.append('  $transaction(arg: any, opts?: any): Promise<any>;')
L.append('  $queryRaw<T = any>(...args: any[]): Promise<T>;')
L.append('  $queryRawUnsafe<T = any>(...args: any[]): Promise<T>;')
L.append('  $executeRaw<T = number>(...args: any[]): Promise<T>;')
L.append('  $executeRawUnsafe<T = number>(...args: any[]): Promise<T>;')
L.append('  $connect(): Promise<void>; $disconnect(): Promise<void>;')
L.append('  $on(...args: any[]): void; $use(...args: any[]): void; $extends(...args: any[]): any;')
L.append('}')
L.append('')
L.append('export declare namespace Prisma {')
L.append('  export type Decimal = any;')
L.append('  export type JsonValue = any; export type JsonObject = any; export type JsonArray = any; export type JsonPrimitive = any;')
L.append('  export type InputJsonValue = any; export type NullableJsonNullValueInput = any; export type JsonNullValueInput = any; export type JsonNullValueFilter = any;')
L.append('  export type QueryMode = "default" | "insensitive";')
L.append('  export type SortOrder = "asc" | "desc";')
L.append('  export type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;')
L.append('  export type TransactionIsolationLevel = any;')
L.append('  export const DbNull: any; export const JsonNull: any; export const AnyNull: any;')
L.append('  export function raw(strings: any, ...values: any[]): any;')
L.append('  export function sql(strings: any, ...values: any[]): any;')
L.append('  export function join(values: any[], separator?: string): any;')
L.append('  export function validator<V>(v: V): V;')
L.append('  export function defineExtension(e: any): any;')
L.append('  export function getExtensionContext(e: any): any;')
L.append('  export const skip: any; export const empty: any;')
L.append('  export type ModelName = string;')
L.append('  export type TypeMap = any;')
L.append('  export type PrismaAction = string;')
L.append('  export type QueryEvent = any;')
L.append('  export type LogLevel = any;')
L.append('  export type Subset<T, U> = any;')
L.append('  export type Exact<T, U> = any;')
L.append('  export type Enumerable<T> = T | T[];')
L.append('  export type AtLeast<T, K> = any;')
L.append('  export class PrismaClientKnownRequestError extends Error { code: string; meta?: any; clientVersion: string; }')
L.append('  export class PrismaClientValidationError extends Error {}')
L.append('  export class PrismaClientInitializationError extends Error {}')
for name in model_fields:
    L.append('  export type %s = %sModel;' % (name, name))
    for suffix in ['WhereInput', 'WhereUniqueInput', 'CreateInput', 'UncheckedCreateInput', 'UpdateInput',
                   'UncheckedUpdateInput', 'CreateManyInput', 'UpdateManyMutationInput', 'Select', 'Include',
                   'OrderByWithRelationInput', 'OrderByWithAggregationInput', 'ScalarWhereWithAggregatesInput']:
        L.append('  export type %s%s = any;' % (name, suffix))
    L.append('  export type %sGetPayload<T> = any;' % name)
for name, members in enums.items():
    union = ' | '.join("'%s'" % m for m in members) or 'string'
    L.append('  export type %s = %s;' % (name, union))
L.append('}')
L.append('')
L.append('export declare const Prisma: any;')
body = '\n'.join(L) + '\n'
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'index.d.ts'), 'w', encoding='utf-8').write(body)
open(os.path.join(out_dir, 'default.d.ts'), 'w', encoding='utf-8').write("export * from './index'\n")
open(os.path.join(out_dir, 'edge.d.ts'), 'w', encoding='utf-8').write("export * from './index'\n")
open(os.path.join(out_dir, 'package.json'), 'w', encoding='utf-8').write('{"name":"@prisma/client","types":"index.d.ts","main":"index.js"}\n')
print('models:', len(model_fields), 'enums:', len(enums), 'lines:', len(L))

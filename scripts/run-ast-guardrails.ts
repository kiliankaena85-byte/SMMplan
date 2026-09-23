/**
 * run-ast-guardrails.ts
 * Нативный TypeScript AST-валидатор архитектурных инвариантов платформы OmniSMM 1.0.
 * Использует официальный TypeScript Compiler API (ts.createSourceFile).
 * Не требует внешних бинарников (ast-grep), работает на любой ОС с субсекундной скоростью.
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export interface GuardrailViolation {
  ruleId: string;
  severity: 'BLOCKER' | 'MAJOR' | 'WARNING';
  file: string;
  line: number;
  message: string;
  snippet: string;
}

/**
 * Извлекает строковое имя свойства из AST-узла (Identifier, StringLiteral и др.)
 */
function getPropertyName(propNameNode: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(propNameNode) || ts.isStringLiteral(propNameNode)) {
    return propNameNode.text;
  }
  return propNameNode.getText(sourceFile).replace(/['"]/g, '');
}

/**
 * Рекурсивно разворачивает обертки выражений:
 * as Type, <Type>, (expr), expr!, expr satisfies Type
 */
function unwrapExpression(expr: ts.Expression): ts.Expression {
  let current: ts.Expression = expr;
  while (current) {
    if (ts.isAsExpression(current)) {
      current = current.expression;
    } else if (ts.isTypeAssertionExpression(current)) {
      current = current.expression;
    } else if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
    } else if (ts.isNonNullExpression(current)) {
      current = current.expression;
    } else if (ts.isSatisfiesExpression(current)) {
      current = current.expression;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Проверяет, является ли объектный литерал типизированным ответом об ошибке { success: false, ... }
 */
function isTypedErrorObject(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): boolean {
  let hasSuccessFalse = false;

  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = getPropertyName(prop.name, sourceFile);
      if (name === 'success') {
        if (ts.isPropertyAssignment(prop)) {
          const init = unwrapExpression(prop.initializer);
          if (
            init.kind === ts.SyntaxKind.FalseKeyword ||
            init.getText(sourceFile) === 'false' ||
            (ts.isPrefixUnaryExpression(init) && init.operator === ts.SyntaxKind.ExclamationToken)
          ) {
            hasSuccessFalse = true;
          }
        }
      }
    }
  }

  return hasSuccessFalse;
}

/**
 * Проверяет, возвращает ли блок catch типизированный объект ошибки { success: false, error: ... }
 * Выполняет строгий AST-анализ:
 * - Запрещает ложные срабатывания от комментариев или строковых литералов
 * - Распознает прямые return { success: false, error: ... }
 * - Распознает возврат через локальную переменную, объявленную в catch-блоке
 * - Учитывает satisfies, as const, type assertions
 * - Отклоняет блоки, которые безусловно ре-бросают ошибку (throw)
 */
function catchReturnsTypedError(catchClause: ts.CatchClause, sourceFile: ts.SourceFile): boolean {
  if (!catchClause.block) return false;

  // 1. Проверяем, нет ли безусловного throw на верхнем уровне catch-блока
  let unconditionallyThrows = false;
  for (const stmt of catchClause.block.statements) {
    if (ts.isThrowStatement(stmt)) {
      unconditionallyThrows = true;
      break;
    }
  }
  if (unconditionallyThrows) {
    return false;
  }

  // 2. Собираем локальные переменные в catch-блоке, инициализированные типизированной ошибкой
  const localTypedVars = new Set<string>();
  for (const stmt of catchClause.block.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          const unwrappedInit = unwrapExpression(decl.initializer);
          if (ts.isObjectLiteralExpression(unwrappedInit) && isTypedErrorObject(unwrappedInit, sourceFile)) {
            localTypedVars.add(decl.name.text);
          }
        }
      }
    }
  }

  // 3. Ищем операторы return в catch-блоке (не заходя во вложенные функции)
  let hasTypedReturn = false;
  const inspectReturns = (n: ts.Node) => {
    if (ts.isReturnStatement(n) && n.expression) {
      const unwrapped = unwrapExpression(n.expression);
      if (ts.isObjectLiteralExpression(unwrapped)) {
        if (isTypedErrorObject(unwrapped, sourceFile)) {
          hasTypedReturn = true;
        }
      } else if (ts.isIdentifier(unwrapped) && localTypedVars.has(unwrapped.text)) {
        hasTypedReturn = true;
      }
    }
    // Не погружаемся во вложенные объявления функций/стрелочных функций
    if (!ts.isFunctionDeclaration(n) && !ts.isArrowFunction(n) && !ts.isFunctionExpression(n)) {
      ts.forEachChild(n, inspectReturns);
    }
  };

  ts.forEachChild(catchClause.block, inspectReturns);
  return hasTypedReturn;
}

/**
 * Проверяет, находится ли throw внутри колбэка db.$transaction,
 * который обернут во внешний try/catch с возвратом { success: false, error }
 */
function isHandledTransactionRollback(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  // 1. Проверяем цепочку предков от throw вверх до $transaction
  let curr: ts.Node | undefined = node.parent;
  let txCall: ts.CallExpression | null = null;
  let insideTxCallback = false;

  while (curr && !ts.isSourceFile(curr)) {
    // Если по пути встретили асинхронный барьер (setTimeout, setInterval, queueMicrotask),
    // то throw не приведет к безопасному роллбэку транзакции
    if (ts.isCallExpression(curr)) {
      const calleeText = curr.expression.getText(sourceFile);
      if (
        calleeText === 'setTimeout' ||
        calleeText === 'setInterval' ||
        calleeText === 'setImmediate' ||
        calleeText === 'queueMicrotask'
      ) {
        return false;
      }

      // Проверяем, является ли curr вызовом .$transaction(...)
      const expr = curr.expression;
      const isTx =
        (ts.isPropertyAccessExpression(expr) && expr.name.text === '$transaction') ||
        calleeText.endsWith('$transaction');

      if (isTx) {
        // Проверяем, является ли node потомком одного из аргументов-колбэков
        for (const arg of curr.arguments) {
          const unwrappedArg = unwrapExpression(arg);
          if (ts.isArrowFunction(unwrappedArg) || ts.isFunctionExpression(unwrappedArg)) {
            // Проверяем, что node действительно находится внутри unwrappedArg
            let check: ts.Node | undefined = node;
            while (check && check !== curr) {
              if (check === unwrappedArg || check === arg) {
                insideTxCallback = true;
                break;
              }
              check = check.parent;
            }
            if (insideTxCallback) break;
          }
        }

        if (insideTxCallback) {
          txCall = curr;
          break;
        }
      }
    }
    curr = curr.parent;
  }

  if (!txCall || !insideTxCallback) return false;

  // 2. Ищем объемлющий try/catch, перехватывающий результат txCall
  let p: ts.Node | undefined = txCall.parent;
  while (p && !ts.isSourceFile(p)) {
    if (ts.isTryStatement(p)) {
      // Проверяем, что txCall находится именно внутри tryBlock
      let isInsideTryBlock = false;
      let check: ts.Node | undefined = txCall;
      while (check && check !== p) {
        if (check === p.tryBlock) {
          isInsideTryBlock = true;
          break;
        }
        check = check.parent;
      }

      if (isInsideTryBlock && p.catchClause && catchReturnsTypedError(p.catchClause, sourceFile)) {
        return true;
      }
    }

    p = p.parent;
  }

  return false;
}

export class AstGuardrailsEngine {
  private projectRoot: string;
  private violations: GuardrailViolation[] = [];

  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Рекурсивный поиск файлов в директории
   */
  private getSourceFiles(dir: string, extensions = ['.ts', '.tsx']): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', '.next', 'dist', '.git', '.planning', '.agents'].includes(file)) {
          results.push(...this.getSourceFiles(fullPath, extensions));
        }
      } else if (extensions.some((ext) => file.endsWith(ext)) && !file.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  /**
   * Анализ отдельного файла через TypeScript AST
   */
  public analyzeFile(filePath: string): void {
    const relPath = path.relative(this.projectRoot, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const isClientFile = content.includes("'use client'") || content.includes('"use client"');
    const isPageFile = /src\/app\/.*\/page\.tsx?$/.test(relPath);
    const isActionFile = relPath.startsWith('src/actions/');
    const isFinancialFile = /src\/(lib\/(wallet-ops|exact-math)|services\/(billing|finance|payment))/.test(relPath);

    const lines = content.split('\n');
    const getSnippet = (node: ts.Node): string => {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      return (lines[line] || '').trim();
    };
    const getLine = (node: ts.Node): number => {
      return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    };

    // -------------------------------------------------------------
    // ПРАВИЛО 2: Запрет "use server" в page.tsx
    // -------------------------------------------------------------
    if (isPageFile && (content.includes('"use server"') || content.includes("'use server'"))) {
      const line = lines.findIndex((l) => l.includes('use server')) + 1;
      this.violations.push({
        ruleId: 'no-use-server-in-page',
        severity: 'BLOCKER',
        file: relPath,
        line: line > 0 ? line : 1,
        message: 'Директива "use server" внутри page.tsx запрещена! Выносите Server Actions строго в src/actions/.',
        snippet: lines[line - 1]?.trim() || '"use server"',
      });
    }

    // -------------------------------------------------------------
    // ПРАВИЛО 3: Запрет импорта Prisma в клиентских компонентах
    // -------------------------------------------------------------
    if (isClientFile) {
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
          if (moduleSpecifier === '@/lib/db' || moduleSpecifier === '@prisma/client' || moduleSpecifier.includes('prisma')) {
            const isClauseTypeOnly = node.importClause?.isTypeOnly ?? false;
            let hasRuntimeSpecifier = false;

            if (!isClauseTypeOnly && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
              hasRuntimeSpecifier = node.importClause.namedBindings.elements.some((el) => !el.isTypeOnly);
            } else if (!isClauseTypeOnly) {
              hasRuntimeSpecifier = true;
            }

            if (hasRuntimeSpecifier) {
              this.violations.push({
                ruleId: 'no-prisma-in-client',
                severity: 'BLOCKER',
                file: relPath,
                line: getLine(node),
                message: 'Runtime импорт Prisma Client в клиентском компоненте "use client" строго запрещен (утечка БД/краш бандла)! Используйте "import type { ... }".',
                snippet: getSnippet(node),
              });
            }
          }
        }
      });
    }

    // -------------------------------------------------------------
    // ПРАВИЛО 4: Admin Server Actions обязаны содержать RBAC-проверки
    // -------------------------------------------------------------
    const isAdminActionFile = relPath.startsWith('src/actions/admin/') && !relPath.includes('__tests__') && !relPath.endsWith('.test.ts');
    if (isAdminActionFile && (content.includes('"use server"') || content.includes("'use server'"))) {
      const rbacKeywords = [
        'requireStaffPermission', 'requireOwnerPermission', 'requireAdmin', 'requireRole',
        'requireAdminPermission', 'verifySession', 'enforceSectionAccess', 'enforcePageRole',
        'enforceAnySectionAccess', 'assertStaff', 'assertAdmin', 'requireSession', 'getSessionUserId',
        'runWithTenantBypass', 'requireAuth', 'rbac'
      ];
      // Check if file uses RBAC directly or delegates to actions in submodules
      const hasDirectRbac = rbacKeywords.some((kw) => content.includes(kw));
      const isActionFacade = content.includes("from './") || content.includes('from "./');

      if (!hasDirectRbac && !isActionFacade) {
        this.violations.push({
          ruleId: 'admin-action-rbac-guard',
          severity: 'BLOCKER',
          file: relPath,
          line: 1,
          message: 'Admin Server Action файл не содержит RBAC-проверки (requireStaffPermission, requireOwnerPermission, requireAdmin)! Защитите действия администратора.',
          snippet: lines[0] || "'use server'",
        });
      }
    }

    // -------------------------------------------------------------
    // Глубокий рекурсивный обход AST с контекстным скоупом
    // -------------------------------------------------------------
    const visitNode = (node: ts.Node, txParam: string | null) => {
      // -------------------------------------------------------------
      // ПРАВИЛО 1: Детекция Transaction Escape (db.* внутри tx-колбэка)
      // -------------------------------------------------------------
      if (txParam && ts.isPropertyAccessExpression(node)) {
        const objText = node.expression.getText(sourceFile);
        const propName = node.name.getText(sourceFile);

        // Исключаем вызов вложенных транзакций или не-db объектов
        if (objText === 'db' && propName !== '$transaction' && !filePath.includes('.test.')) {
          this.violations.push({
            ruleId: 'no-transaction-escape',
            severity: 'BLOCKER',
            file: relPath,
            line: getLine(node),
            message: `Обнаружен Transaction Escape: обращение к глобальному 'db.${propName}' внутри транзакции! Используйте '${txParam}.${propName}'.`,
            snippet: getSnippet(node),
          });
        }
      }

      // -------------------------------------------------------------
      // ПРАВИЛО 5: Server Actions не должны выбрасывать сырой throw
      // -------------------------------------------------------------
      if (isActionFile && ts.isThrowStatement(node)) {
        let parent: ts.Node | undefined = node.parent;
        let isInsideCatch = false;
        while (parent && !ts.isFunctionDeclaration(parent) && !ts.isArrowFunction(parent)) {
          if (ts.isCatchClause(parent)) {
            isInsideCatch = true;
            break;
          }
          parent = parent.parent;
        }

        const isTxRollback = isHandledTransactionRollback(node, sourceFile);

        if (!isInsideCatch && !isTxRollback && !filePath.includes('.test.')) {
          this.violations.push({
            ruleId: 'server-action-typed-return',
            severity: 'WARNING',
            file: relPath,
            line: getLine(node),
            message: isAdminActionFile
              ? 'Сырой "throw new Error" в Admin Server Action. Рекомендуется возвращать типизированный { success: false, error: "..." }.'
              : 'Сырой "throw new Error" в Server Action. Рекомендуется возвращать типизированный { success: false, error: "..." }.',
            snippet: getSnippet(node),
          });
        }
      }

      // -------------------------------------------------------------
      // ПРАВИЛО 6: Сетевой fetch(...) обязан содержать signal/timeout
      // -------------------------------------------------------------
      if (ts.isCallExpression(node)) {
        const fnName = node.expression.getText(sourceFile);
        if (fnName === 'fetch' && !filePath.includes('.test.') && !filePath.includes('scripts/')) {
          const args = node.arguments;
          let hasSignal = false;

          if (args.length >= 2) {
            const options = unwrapExpression(args[1]);
            if (ts.isObjectLiteralExpression(options)) {
              hasSignal = options.properties.some((prop) => {
                if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
                  return getPropertyName(prop.name, sourceFile) === 'signal';
                }
                return false;
              });
            }
          }

          if (!hasSignal) {
            this.violations.push({
              ruleId: 'fetch-timeout-required',
              severity: 'MAJOR',
              file: relPath,
              line: getLine(node),
              message: 'Вызов fetch(...) без опции "signal: AbortSignal.timeout(...)". Несет риск зависания соединения.',
              snippet: getSnippet(node),
            });
          }
        }
      }

      // -------------------------------------------------------------
      // Особая обработка $transaction вызовов:
      // Передаем имя транзакционного параметра ТОЛЬКО внутрь аргумента-колбэка
      // -------------------------------------------------------------
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        if (text.endsWith('$transaction') && node.arguments.length > 0) {
          // Обрабатываем выражение db.$transaction без флага escape
          visitNode(node.expression, txParam);

          // Обрабатываем аргументы
          node.arguments.forEach((arg) => {
            const unwrappedArg = unwrapExpression(arg);
            if (ts.isArrowFunction(unwrappedArg) || ts.isFunctionExpression(unwrappedArg)) {
              let innerTxName = 'tx';
              if (unwrappedArg.parameters.length > 0) {
                innerTxName = unwrappedArg.parameters[0].name.getText(sourceFile);
              }
              // Обходим тело колбэка с передачей innerTxName
              unwrappedArg.forEachChild((child) => visitNode(child, innerTxName));
            } else {
              visitNode(arg, txParam);
            }
          });
          return;
        }
      }

      // Рекурсивный спуск ко всем дочерним узлам с сохранением текущего контекста транзакции
      ts.forEachChild(node, (child) => visitNode(child, txParam));
    };

    visitNode(sourceFile, null);
  }

  /**
   * Сканирование всей директории src/
   */
  public run(targetDir = 'src'): { violations: GuardrailViolation[]; passed: boolean } {
    console.log(`🛡️ [AST Guardrails] Scanning '${targetDir}' for architectural invariants...\n`);
    const fullTarget = path.resolve(this.projectRoot, targetDir);
    const files = this.getSourceFiles(fullTarget);

    console.log(`📦 Found ${files.length} TypeScript source files.`);
    const startTime = Date.now();

    for (const file of files) {
      try {
        this.analyzeFile(file);
      } catch (e) {
        console.error(`Error parsing file ${file}:`, e);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ AST analysis completed in ${elapsed}s.\n`);

    const blockers = this.violations.filter((v) => v.severity === 'BLOCKER');
    const majors = this.violations.filter((v) => v.severity === 'MAJOR');
    const warnings = this.violations.filter((v) => v.severity === 'WARNING');

    console.log('📊 AST Guardrails Audit Results:');
    console.log(`   - 🛑 BLOCKERS: ${blockers.length}`);
    console.log(`   - ⚠️ MAJORS:   ${majors.length}`);
    console.log(`   - ℹ️ WARNINGS: ${warnings.length}`);

    if (this.violations.length > 0) {
      console.log('\n🔍 Detailed Violations:');
      this.violations.forEach((v, idx) => {
        const icon = v.severity === 'BLOCKER' ? '🛑' : v.severity === 'MAJOR' ? '⚠️' : 'ℹ️';
        console.log(`\n[${idx + 1}] ${icon} [${v.severity}] Rule: ${v.ruleId}`);
        console.log(`    File: ${v.file}:${v.line}`);
        console.log(`    Message: ${v.message}`);
        console.log(`    Snippet: "${v.snippet}"`);
      });
    }

    const passed = blockers.length === 0;
    const majorCount = majors.length;
    const warningCount = warnings.length;
    const summary = `blockers=${blockers.length}, MAJOR=${majorCount}, WARNING=${warningCount}`;

    if (passed && majorCount + warningCount === 0) {
      console.log('\n🟢 [AST Guardrails PASS] Zero blockers found! Architecture is clean.');
    } else if (passed) {
      // Честный вердикт: нулевой бюджет по замечаниям ещё не достигнут, поэтому
      // "Architecture is clean" здесь печатать нельзя (см. AUDIT-2026-09-23, REPO-04).
      console.log(`\n🟡 [AST Guardrails PASS WITH FINDINGS] Zero blockers, но есть замечания (${summary}).`);
      console.log('   Вердикт «clean» не выставляется: см. список выше. Для строгого режима: --strict');
    } else {
      console.log(`\n🔴 [AST Guardrails FAIL] Critical architectural violations must be fixed (${summary}).`);
    }

    return { violations: this.violations, passed };
  }

  /**
   * Dedicated AST audit for Server Actions Zero-Throw invariant (AGENTS.md Section 2).
   * Scans src/actions for raw unhandled throw statements and validates typed return patterns.
   */
  public auditServerActionsZeroThrow(targetDir = 'src/actions'): {
    scannedCount: number;
    violations: GuardrailViolation[];
    compliantFiles: string[];
    violatingFiles: string[];
    hasBlockers: boolean;
  } {
    const fullTarget = path.resolve(this.projectRoot, targetDir);
    const files = this.getSourceFiles(fullTarget);
    const startViolationIdx = this.violations.length;

    for (const file of files) {
      try {
        this.analyzeFile(file);
      } catch (e) {
        console.error(`Error parsing action file ${file}:`, e);
      }
    }

    const actionViolations = this.violations.slice(startViolationIdx).filter(
      (v) => v.ruleId === 'server-action-typed-return'
    );

    const violatingFileSet = new Set(actionViolations.map((v) => v.file));
    const violatingFiles = Array.from(violatingFileSet);
    const compliantFiles = files
      .map((f) => path.relative(this.projectRoot, f).replace(/\\/g, '/'))
      .filter((f) => !violatingFileSet.has(f));

    return {
      scannedCount: files.length,
      violations: actionViolations,
      compliantFiles,
      violatingFiles,
      hasBlockers: actionViolations.some((v) => v.severity === 'BLOCKER'),
    };
  }
}

// CLI Execution
if (process.argv[1]?.includes('run-ast-guardrails.ts')) {
  const engine = new AstGuardrailsEngine();
  const strict = process.argv.includes('--strict');
  const { passed, violations } = engine.run('src');

  // --strict: ненулевой код возврата не только на BLOCKER, но и на MAJOR.
  // По умолчанию режим неблокирующий (обратная совместимость с существующим CI).
  const hasMajor = violations.some((v) => v.severity === 'MAJOR');

  if (!passed || (strict && hasMajor)) {
    process.exit(1);
  }
}

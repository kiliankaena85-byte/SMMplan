import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AstGuardrailsEngine } from '../../scripts/run-ast-guardrails';

describe('AST Guardrails Parser Invariant Tests', () => {
  const tempDir = path.resolve(process.cwd(), 'temp-ast-guardrails-test');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('fetch-timeout-required rule', () => {
    it('should NOT flag fetch with type assertions (as unknown as RequestInit) when signal is present', () => {
      const filePath = path.join(tempDir, 'fetch-test-1.ts');
      fs.writeFileSync(
        filePath,
        `
        export async function callApi(url: string) {
          return fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
          } as unknown as RequestInit);
        }
        `
      );

      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'fetch-timeout-required');
      expect(violations).toHaveLength(0);
    });

    it('should NOT flag fetch with angle-bracket type assertion (<RequestInit>{ ... }) when signal is present', () => {
      const filePath = path.join(tempDir, 'fetch-test-2.ts');
      fs.writeFileSync(
        filePath,
        `
        export async function callApi(url: string) {
          return fetch(url, <RequestInit>{
            method: 'POST',
            signal: AbortSignal.timeout(10000),
          });
        }
        `
      );

      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'fetch-timeout-required');
      expect(violations).toHaveLength(0);
    });

    it('should flag fetch with type assertions when signal is missing', () => {
      const filePath = path.join(tempDir, 'fetch-test-3.ts');
      fs.writeFileSync(
        filePath,
        `
        export async function callApi(url: string) {
          return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          } as unknown as RequestInit);
        }
        `
      );

      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'fetch-timeout-required');
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe('fetch-timeout-required');
    });

    it('should NOT flag fetch with satisfies RequestInit expression when signal is present', () => {
      const filePath = path.join(tempDir, 'fetch-satisfies.ts');
      fs.writeFileSync(
        filePath,
        `
        export async function callApi(url: string) {
          return fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
          } satisfies RequestInit);
        }
        `
      );

      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'fetch-timeout-required');
      expect(violations).toHaveLength(0);
    });

    it('should NOT flag fetch when signal property is a quoted string literal', () => {
      const filePath = path.join(tempDir, 'fetch-string-literal.ts');
      fs.writeFileSync(
        filePath,
        `
        export async function callApi(url: string) {
          return fetch(url, {
            method: 'POST',
            'signal': AbortSignal.timeout(5000),
          });
        }
        `
      );

      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'fetch-timeout-required');
      expect(violations).toHaveLength(0);
    });

    it('should verify real gemini-client and gemini-tool-client files have zero fetch violations', () => {
      const geminiClientPath = path.resolve(process.cwd(), 'src/services/ai/gemini-client.ts');
      const geminiToolClientPath = path.resolve(process.cwd(), 'src/services/ai/gemini-tool-client.ts');

      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(geminiClientPath);
      engine.analyzeFile(geminiToolClientPath);

      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'fetch-timeout-required');
      expect(violations).toHaveLength(0);
    });
  });

  describe('server-action-typed-return rule', () => {
    it('should NOT flag throw inside db.$transaction callback when outer try/catch returns { success: false, error }', () => {
      const actionsDir = path.join(tempDir, 'src/actions/user');
      fs.mkdirSync(actionsDir, { recursive: true });
      const filePath = path.join(actionsDir, 'tx-test.ts');
      fs.writeFileSync(
        filePath,
        `
        'use server';
        export async function myAction() {
          try {
            await db.$transaction(async (tx) => {
              const item = await tx.item.findUnique({ where: { id: '1' } });
              if (!item) {
                throw new Error("Item not found");
              }
            });
            return { success: true };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        }
        `
      );

      const engine = new AstGuardrailsEngine(tempDir);
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'server-action-typed-return');
      expect(violations).toHaveLength(0);
    });

    it('should NOT flag throw inside db.$transaction when catch block returns typed error via local variable', () => {
      const actionsDir = path.join(tempDir, 'src/actions/user');
      fs.mkdirSync(actionsDir, { recursive: true });
      const filePath = path.join(actionsDir, 'tx-local-var.ts');
      fs.writeFileSync(
        filePath,
        `
        'use server';
        export async function myAction() {
          try {
            await db.$transaction(async (tx) => {
              throw new Error("Validation error");
            });
            return { success: true };
          } catch (e: any) {
            const res = { success: false, error: e.message };
            return res;
          }
        }
        `
      );

      const engine = new AstGuardrailsEngine(tempDir);
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'server-action-typed-return');
      expect(violations).toHaveLength(0);
    });

    it('should flag throw inside db.$transaction callback when outer try/catch is missing', () => {
      const actionsDir = path.join(tempDir, 'src/actions/user');
      fs.mkdirSync(actionsDir, { recursive: true });
      const filePath = path.join(actionsDir, 'tx-unhandled.ts');
      fs.writeFileSync(
        filePath,
        `
        'use server';
        export async function myAction() {
          await db.$transaction(async (tx) => {
            throw new Error("Unhandled transaction failure");
          });
          return { success: true };
        }
        `
      );

      const engine = new AstGuardrailsEngine(tempDir);
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'server-action-typed-return');
      expect(violations).toHaveLength(1);
    });

    it('should flag throw inside db.$transaction callback when catch block rethrows without typed return', () => {
      const actionsDir = path.join(tempDir, 'src/actions/user');
      fs.mkdirSync(actionsDir, { recursive: true });
      const filePath = path.join(actionsDir, 'tx-rethrow.ts');
      fs.writeFileSync(
        filePath,
        `
        'use server';
        export async function myAction() {
          try {
            await db.$transaction(async (tx) => {
              throw new Error("Transaction failed");
            });
            return { success: true };
          } catch (e: any) {
            throw e;
          }
        }
        `
      );

      const engine = new AstGuardrailsEngine(tempDir);
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'server-action-typed-return');
      expect(violations).toHaveLength(1);
    });

    it('should flag throw inside db.$transaction when catch block contains comments mentioning success: false but re-throws', () => {
      const actionsDir = path.join(tempDir, 'src/actions/user');
      fs.mkdirSync(actionsDir, { recursive: true });
      const filePath = path.join(actionsDir, 'tx-comment-rethrow.ts');
      fs.writeFileSync(
        filePath,
        `
        'use server';
        export async function myAction() {
          try {
            await db.$transaction(async (tx) => {
              throw new Error("Transaction failed");
            });
            return { success: true };
          } catch (e: any) {
            // TODO: In the future, return { success: false, error: e.message }
            throw e;
          }
        }
        `
      );

      const engine = new AstGuardrailsEngine(tempDir);
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'server-action-typed-return');
      expect(violations).toHaveLength(1);
    });

    it('should flag throw inside setTimeout inside db.$transaction callback even if outer try/catch exists', () => {
      const actionsDir = path.join(tempDir, 'src/actions/user');
      fs.mkdirSync(actionsDir, { recursive: true });
      const filePath = path.join(actionsDir, 'tx-async-timer.ts');
      fs.writeFileSync(
        filePath,
        `
        'use server';
        export async function myAction() {
          try {
            await db.$transaction(async (tx) => {
              setTimeout(() => {
                throw new Error("Async explosion inside timer");
              }, 100);
            });
            return { success: true };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        }
        `
      );

      const engine = new AstGuardrailsEngine(tempDir);
      engine.analyzeFile(filePath);
      const violations = (engine as any).violations.filter((v: any) => v.ruleId === 'server-action-typed-return');
      expect(violations).toHaveLength(1);
    });

    it('should verify real referral.action.ts, payments.ts, and compensation.ts have zero transaction rollback violations', () => {
      const engine = new AstGuardrailsEngine();
      engine.analyzeFile(path.resolve(process.cwd(), 'src/actions/user/referral.action.ts'));
      engine.analyzeFile(path.resolve(process.cwd(), 'src/actions/admin/finance/payments.ts'));
      engine.analyzeFile(path.resolve(process.cwd(), 'src/actions/support/compensation.ts'));

      const violations = (engine as any).violations.filter(
        (v: any) =>
          v.ruleId === 'server-action-typed-return' &&
          (v.snippet.includes('Учетная запись не найдена') ||
            v.snippet.includes('Нет средств для перевода') ||
            v.snippet.includes('PAYMENT_ALREADY_PROCESSED') ||
            v.snippet.includes('policyCheck.error'))
      );
      expect(violations).toHaveLength(0);
    });
  });
});

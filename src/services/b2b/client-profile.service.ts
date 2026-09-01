/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * B2B Client Profile Service with AES-256 VaultService Encryption (P3-21).
 */

import { db } from '@/lib/db';
import { VaultService } from '@/lib/vault';

export interface B2BRequisitesInput {
  companyName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  directorName?: string | null;
  legalAddress?: string | null;
}

export class B2BClientProfileService {
  /**
   * Encrypts sensitive B2B fields before persisting to database.
   */
  static encryptB2BFields(input: B2BRequisitesInput) {
    return {
      ...(input.companyName !== undefined ? { companyName: input.companyName?.trim() || null } : {}),
      ...(input.inn !== undefined ? { inn: input.inn ? VaultService.encrypt(input.inn.trim()) : null } : {}),
      ...(input.kpp !== undefined ? { kpp: input.kpp ? VaultService.encrypt(input.kpp.trim()) : null } : {}),
      ...(input.ogrn !== undefined ? { ogrn: input.ogrn ? VaultService.encrypt(input.ogrn.trim()) : null } : {}),
      ...(input.directorName !== undefined ? { directorName: input.directorName ? VaultService.encrypt(input.directorName.trim()) : null } : {}),
      ...(input.legalAddress !== undefined ? { legalAddress: input.legalAddress ? VaultService.encrypt(input.legalAddress.trim()) : null } : {}),
    };
  }

  /**
   * Decrypts sensitive B2B fields when reading from database.
   */
  static decryptB2BFields(user: Record<string, any>) {
    if (!user) return null;
    return {
      ...user,
      inn: user.inn ? VaultService.decrypt(user.inn) : null,
      kpp: user.kpp ? VaultService.decrypt(user.kpp) : null,
      ogrn: user.ogrn ? VaultService.decrypt(user.ogrn) : null,
      directorName: user.directorName ? VaultService.decrypt(user.directorName) : null,
      legalAddress: user.legalAddress ? VaultService.decrypt(user.legalAddress) : null,
    };
  }
}

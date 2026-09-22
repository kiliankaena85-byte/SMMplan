const fs = require('fs');

function replaceInFile(file, searchRegex, replaceStr) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(searchRegex, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  } catch (err) {
    console.error(`Error in ${file}:`, err.message);
  }
}

// 1. changeTicketStatus|adminChangeTicketStatus src/actions/support/ticket.ts
replaceInFile('src/actions/support/ticket.ts', /export \{ changeTicketStatus as adminChangeTicketStatus \};?/g, '');

// 2. formatCleanCategoryName|formatCleanActivityName src/components/admin/catalog/catalog-filters.tsx
replaceInFile('src/components/admin/catalog/catalog-filters.tsx', /export \{ formatCleanCategoryName as formatCleanActivityName \};?/g, '');

// 3. TenantSwitcher|GlobalSiteSwitcher src/components/admin/tenant-switcher.tsx
replaceInFile('src/components/admin/tenant-switcher.tsx', /export \{ GlobalSiteSwitcher as TenantSwitcher \};?/g, '');

// 4. MAIN_NAV_ITEMS|DOCK_NAV_ITEMS src/lib/navigation.ts
replaceInFile('src/lib/navigation.ts', /export const DOCK_NAV_ITEMS = MAIN_NAV_ITEMS;/g, '');

// 5. criticalQueue|queuePayment src/lib/queue-manager.ts
replaceInFile('src/lib/queue-manager.ts', /export const queuePayment = criticalQueue;/g, '');

// 6. defaultQueue|queueOrder src/lib/queue-manager.ts
replaceInFile('src/lib/queue-manager.ts', /export const queueOrder = defaultQueue;/g, '');

// 7. bulkQueue|queueSync src/lib/queue-manager.ts
replaceInFile('src/lib/queue-manager.ts', /export const queueSync = bulkQueue;/g, '');

// 8. adminCatalogService|catalogService src/services/admin/catalog.service.ts
replaceInFile('src/services/admin/catalog.service.ts', /export const catalogService = adminCatalogService;/g, '');

// 9. FluxTenantStrategy|default src/tenants/flux/strategy.ts
replaceInFile('src/tenants/flux/strategy.ts', /export const FluxTenantStrategy = \{/g, 'const FluxTenantStrategy = {');

// 10. SmmplanTenantStrategy|default src/tenants/smmplan/strategy.ts
replaceInFile('src/tenants/smmplan/strategy.ts', /export const SmmplanTenantStrategy = \{/g, 'const SmmplanTenantStrategy = {');

// 11. cyrillicToSlug|slugify src/utils/slugify.ts
replaceInFile('src/utils/slugify.ts', /export const slugify = cyrillicToSlug;/g, '');

// 12. TargetTypeEnum|LinkType src/utils/target-type-mapper.ts
replaceInFile('src/utils/target-type-mapper.ts', /export \{ TargetTypeEnum as LinkType \};?/g, '');
replaceInFile('src/utils/target-type-mapper.ts', /export const LinkType = TargetTypeEnum;/g, '');

// 13. isTargetTypeCompatible|isLinkServiceCompatible src/utils/target-type-mapper.ts
replaceInFile('src/utils/target-type-mapper.ts', /export \{ isTargetTypeCompatible as isLinkServiceCompatible \};?/g, '');
replaceInFile('src/utils/target-type-mapper.ts', /export const isLinkServiceCompatible = isTargetTypeCompatible;/g, '');

// 14. processGeoAvailabilityCheck|default src/workers/processors/geo-availability.processor.ts
replaceInFile('src/workers/processors/geo-availability.processor.ts', /export async function processGeoAvailabilityCheck/g, 'async function processGeoAvailabilityCheck');

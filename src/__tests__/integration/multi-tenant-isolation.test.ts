import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { getCachedNetworks, getCachedServicesByCategory } from '@/actions/order/catalog';

describe('Multi-Tenant Data Isolation (Integration)', () => {
  beforeEach(async () => {
    // Clear the specific tables in the test database
    await db.service.deleteMany({});
    await db.category.deleteMany({});
    await db.network.deleteMany({});
    
    // Seed SMMPLAN tenant data
    const smmplanNetwork = await db.network.create({
      data: {
        name: 'SMMplan Network',
        slug: 'smmplan-network',
        sort: 1,
        tenantId: 'smmplan',
        categories: {
          create: {
            name: 'SMMplan Category',
            slug: 'smmplan-category',
            sort: 1,
            tenantId: 'smmplan',
            services: {
              create: {
                name: 'SMMplan Service',
                numericId: 10001,
                minQty: 100,
                maxQty: 1000,
                pricePerUnitRub: 1.5,
                rate: 1.5,
                providerId: 'provider-1',
                providerServiceId: '1',
                tenantId: 'smmplan'
              }
            }
          }
        }
      }
    });

    // Seed FLUX tenant data
    await db.network.create({
      data: {
        name: 'Flux Network',
        slug: 'flux-network',
        sort: 2,
        tenantId: 'flux',
        categories: {
          create: {
            name: 'Flux Category',
            slug: 'flux-category',
            sort: 1,
            tenantId: 'flux',
            services: {
              create: {
                name: 'Flux Service',
                numericId: 10002,
                minQty: 50,
                maxQty: 500,
                pricePerUnitRub: 2.0,
                rate: 2.0,
                providerId: 'provider-1',
                providerServiceId: '2',
                tenantId: 'flux'
              }
            }
          }
        }
      }
    });
  });

  it('should isolate smmplan network queries', async () => {
    const networks = await getCachedNetworks('smmplan');
    expect(networks).toHaveLength(1);
    expect(networks[0].name).toBe('SMMplan Network');
    expect(networks[0].categories[0].name).toBe('SMMplan Category');
  });

  it('should isolate flux network queries', async () => {
    const networks = await getCachedNetworks('flux');
    expect(networks).toHaveLength(1);
    expect(networks[0].name).toBe('Flux Network');
    expect(networks[0].categories[0].name).toBe('Flux Category');
  });

  it('should not bleed services between tenants inside the category', async () => {
    const smmplanCategory = await db.category.findFirst({ where: { tenantId: 'smmplan' } });
    const fluxCategory = await db.category.findFirst({ where: { tenantId: 'flux' } });

    const smmplanServices = await getCachedServicesByCategory(smmplanCategory!.id, 'smmplan');
    const fluxServices = await getCachedServicesByCategory(fluxCategory!.id, 'flux');

    expect(smmplanServices).toHaveLength(1);
    expect(smmplanServices[0].name).toBe('SMMplan Service');
    
    expect(fluxServices).toHaveLength(1);
    expect(fluxServices[0].name).toBe('Flux Service');
  });
});

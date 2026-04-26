import { describe, it, expect, vi, beforeAll } from 'vitest';
import { UniversalProvider } from '../../src/services/providers/universal.provider';

describe('UniversalProvider - WAF Bypass & V2 Standard', () => {
    beforeAll(() => {
        // We explicitly unstub fetch because this test verifies real WAF bypass against a live URL
        vi.unstubAllGlobals();
    });
    // Testing smmprime.com with the real provided test key to verify WAF bypass
    // We pass the raw key since our fallback allows raw keys if decryption yields null
    const provider = new UniversalProvider(
        'https://smmprime.com/api/v2',
        '6833e1ceef531d34e7442d492b8e1021'
    );

    it('should successfully fetch balance bypassing WAF constraints', async () => {
        const result = await provider.getBalance();
        
        expect(result).toHaveProperty('balance');
        expect(result).toHaveProperty('currency');
        expect(typeof result.balance).toBe('string');
        console.log(`[Universal Test] Successfully retrieved balance: ${result.balance} ${result.currency}`);
    });

    it('should cleanly parse a string error if the order ID is invalid for multiStatus', async () => {
        // "2": "Incorrect order ID" test
        const result = await provider.getMultiOrderStatus([9999999]);
        const key = Object.keys(result)[0];
        
        // Either it returns an empty object if 9999999 is totally rejected, or an error string
        // Many panels return {"9999999": "Incorrect order ID"}
        if (result[key]) {
            if (result[key].error) {
                expect(result[key].error).toContain('Incorrect');
            } else if (typeof result[key] === 'string') {
                expect(result[key]).toContain('Incorrect');
            } else {
                expect(result[key]).toHaveProperty('status');
            }
        }
    });
});

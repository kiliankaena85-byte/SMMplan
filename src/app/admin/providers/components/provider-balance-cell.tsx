'use client';

import { useState, useEffect } from 'react';
import { checkProviderConnection } from '@/actions/admin/providers/crud';
import { Loader2, AlertCircle } from 'lucide-react';

export function ProviderBalanceCell({ providerId }: { providerId: string }) {
  const [balance, setBalance] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchBalance() {
      try {
        const res = await checkProviderConnection(providerId);
        if (!mounted) return;
        
        if (res.success && res.balance) {
          setBalance(res.balance);
          setCurrency(res.currency || '');
        } else {
          setError(res.error || 'Failed to fetch');
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchBalance();
    
    return () => { mounted = false; };
  }, [providerId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Sync...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div title={error} className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2 py-1 rounded-md border border-destructive/20 cursor-help w-fit">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold">Error</span>
      </div>
    );
  }

  const numBalance = parseFloat(balance || '0');
  const isLowBalance = numBalance < 10;

  return (
    <div className={`flex items-baseline gap-1.5 px-2.5 py-1 rounded-md border w-fit ${
      isLowBalance 
        ? 'bg-destructive/10 border-destructive/30 text-destructive' 
        : 'bg-success/10 border-emerald-500/20 text-success'
    }`}>
      <span className="font-mono font-bold text-sm tracking-tight">
        {new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(numBalance)}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{currency}</span>
    </div>
  );
}

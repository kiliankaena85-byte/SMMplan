import { useEffect } from "react";
import { PublicNetwork } from "@/actions/order/catalog";

interface UseUrlSyncProps {
  catalog: PublicNetwork[];
  networkId: string;
  setNetworkId: (id: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  quantity: number;
  setQuantity: (q: number) => void;
}

export function useUrlSync({
  catalog,
  networkId,
  setNetworkId,
  categoryId,
  setCategoryId,
  quantity,
  setQuantity
}: UseUrlSyncProps) {
  
  // Initialization from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlNetwork = params.get("network");
      const urlCategory = params.get("category");
      const urlQty = params.get("q");
      
      if (urlNetwork && catalog.some(n => n.id === urlNetwork)) setNetworkId(urlNetwork);
      if (urlCategory) setCategoryId(urlCategory);
      if (urlQty) {
        const qtyParsed = parseInt(urlQty, 10);
        if (!isNaN(qtyParsed)) setQuantity(qtyParsed);
      }
    }
  }, [catalog, setNetworkId, setCategoryId, setQuantity]);

  // Sync state to URL with debounce
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (networkId) params.set("network", networkId);
      if (categoryId) params.set("category", categoryId);
      params.set("q", quantity.toString());
      
      const timeoutId = setTimeout(() => {
        window.history.replaceState(null, "", `?${params.toString()}`);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [networkId, categoryId, quantity]);
}

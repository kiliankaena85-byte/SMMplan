"use client";

import { useState, useEffect } from "react";
import { PublicNetwork, PublicService, getServicesByCategoryAction } from "@/actions/order/catalog";
import { useUrlValidation } from "./useUrlValidation";
import { useServicePricing } from "./useServicePricing";
import { useUrlSync } from "./useUrlSync";

export function useLandingOrderEngine(initialCatalog: PublicNetwork[] = [], initialEmail: string = "") {
  // --- Form State ---
  const [url, setUrl] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [quantity, setQuantity] = useState(1000);
  const [email, setEmail] = useState(initialEmail);
  const [customData, setCustomData] = useState("");
  
  // --- Data State ---
  const [catalog, setCatalog] = useState<PublicNetwork[]>(initialCatalog);
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  
  // Custom hooks for logic
  const validation = useUrlValidation(url, networkId);
  const pricing = useServicePricing(selectedService, quantity);

  // Use URL-as-State sync
  useUrlSync({ catalog, networkId, setNetworkId, categoryId, setCategoryId, quantity, setQuantity });

  // --- Auto-detect platform logic ---
  useEffect(() => {
    if (validation.platformDetected && !networkId) {
      const matchingNetwork = catalog.find(n => n.id === validation.platformDetected);
      if (matchingNetwork) {
        setNetworkId(matchingNetwork.id);
      }
    }
  }, [validation.platformDetected, networkId, catalog]);

  // Reset selected service when category or network changes
  useEffect(() => {
    setSelectedService(null);
  }, [networkId, categoryId]);

  // Fetch services when category changes
  useEffect(() => {
    let isMounted = true;
    if (!categoryId) {
      setServices([]);
      return;
    }

    setIsLoadingServices(true);
    getServicesByCategoryAction(categoryId).then((data) => {
      if (isMounted) {
        setServices(data || []);
        setIsLoadingServices(false);
      }
    }).catch(() => {
      if (isMounted) {
        setServices([]);
        setIsLoadingServices(false);
      }
    });

    return () => { isMounted = false; };
  }, [categoryId]);

  return {
    url, setUrl,
    networkId, setNetworkId,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    customData, setCustomData,
    catalog, setCatalog,
    services, isLoadingServices,
    ...validation,
    ...pricing
  };
}

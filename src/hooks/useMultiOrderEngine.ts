"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { getPublicCatalogAction, PublicNetwork, PublicService, getServicesByCategoryAction } from "@/actions/order/catalog";
import { extractLinks, detectPlatformLite, cleanUrlTitle } from "@/utils/link-extractor";

export interface OrderTask {
  id: string;
  url: string;
  cleanTitle: string;
  platform: IntelligencePlatform;
  categoryId: string;
  serviceId: string;
  quantity: number;
  status: 'new' | 'configured';
  priceCents: number;
  availableServices: PublicService[];
  isLoadingServices: boolean;
}

export function useMultiOrderEngine() {
  const [tasks, setTasks] = useState<OrderTask[]>([]);
  const [catalog, setCatalog] = useState<PublicNetwork[]>([]);
  const hasFetchedCatalog = useRef(false);

  // 1. Initial Catalog Load
  useEffect(() => {
    if (catalog.length === 0 && !hasFetchedCatalog.current) {
      hasFetchedCatalog.current = true;
      getPublicCatalogAction().then(res => {
        if (res.success && res.data) {
          setCatalog(res.data);
        }
      });
    }
  }, [catalog.length]);

  // Handle mass pasting or adding
  const addLinks = useCallback((text: string) => {
    const extracted = extractLinks(text);
    if (extracted.length === 0) return;

    const newTasks = extracted.map(url => {
      const platform = detectPlatformLite(url);
      
      // Auto-assign category if network is matched
      let defaultCategoryId = "";
      if (catalog.length > 0 && platform !== IntelligencePlatform.OTHER) {
        const net = catalog.find(n => n.slug.toLowerCase().includes(platform.toLowerCase()));
        if (net && net.categories.length > 0) {
           defaultCategoryId = net.categories[0].id; // Assign first category by default
        }
      }

      return {
        id: crypto.randomUUID(),
        url,
        cleanTitle: cleanUrlTitle(url),
        platform,
        categoryId: defaultCategoryId,
        serviceId: "",
        quantity: 100,
        status: 'new' as const,
        priceCents: 0,
        availableServices: [],
        isLoadingServices: !!defaultCategoryId
      };
    });

    // Limit to 50 tasks max
    setTasks(prev => {
       const combined = [...prev, ...newTasks];
       if (combined.length > 50) return combined.slice(0, 50);
       return combined;
    });
  }, [catalog]);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<OrderTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  // Fetch services when category changes for a task
  useEffect(() => {
    tasks.forEach(task => {
      if (task.categoryId && task.availableServices.length === 0 && task.isLoadingServices) {
        getServicesByCategoryAction(task.categoryId)
          .then(svcs => {
            updateTask(task.id, { 
              availableServices: svcs, 
              isLoadingServices: false 
            });
          })
          .catch(err => {
            console.error("Failed to fetch services:", err);
            updateTask(task.id, { 
              isLoadingServices: false 
            });
          });
      }
    });
  }, [tasks, updateTask]);

  // Apply to all similar links logic (Smart Cloning)
  const applyToAllSamePlatform = useCallback((sourceTaskId: string) => {
    setTasks(prev => {
      const sourceTask = prev.find(t => t.id === sourceTaskId);
      if (!sourceTask || !sourceTask.serviceId) return prev;

      return prev.map(t => {
        if (t.id !== sourceTaskId && t.platform === sourceTask.platform && t.status === 'new') {
          return {
            ...t,
            categoryId: sourceTask.categoryId,
            serviceId: sourceTask.serviceId,
            quantity: sourceTask.quantity,
            availableServices: sourceTask.availableServices, // Copy cache to avoid refetch
            status: 'configured',
            priceCents: Math.max(1, Math.ceil((sourceTask.availableServices.find(s => s.id === sourceTask.serviceId)?.pricePerUnitRub || 0) * 100 * sourceTask.quantity))
          };
        }
        return t;
      });
    });
  }, []);

  // Sync pricing when quantity or service changes
  const setTaskConfig = useCallback((id: string, serviceId: string, quantity: number, pricePerUnitRub: number) => {
     updateTask(id, {
        serviceId,
        quantity,
        status: serviceId ? 'configured' : 'new',
        priceCents: serviceId ? Math.max(1, Math.ceil(pricePerUnitRub * 100 * quantity)) : 0
     });
  }, [updateTask]);

  // Load a single task pre-filled for Reorder
  const loadReorderTask = useCallback((data: { serviceId: string; categoryId: string; link: string; quantity: number }) => {
    const taskId = crypto.randomUUID();
    const url = data.link || "";
    
    // Add task in 'new' state, waiting for services to load
    setTasks([{
      id: taskId,
      url,
      cleanTitle: cleanUrlTitle(url),
      platform: detectPlatformLite(url),
      categoryId: data.categoryId,
      serviceId: data.serviceId, // Temporarily save it here, won't be 'configured' until services load
      quantity: data.quantity || 100,
      status: 'new',
      priceCents: 0,
      availableServices: [],
      isLoadingServices: true
    }]);

    // Force fetch services for this category
    getServicesByCategoryAction(data.categoryId).then(svcs => {
      setTasks(prev => {
        return prev.map(t => {
          if (t.id === taskId) {
            const svc = svcs.find(s => s.id === data.serviceId);
            const priceRub = svc?.pricePerUnitRub || 0;
            return {
              ...t,
              availableServices: svcs,
              isLoadingServices: false,
              serviceId: svc ? data.serviceId : "", // Reset if service no longer exists
              status: svc ? 'configured' : 'new',
              priceCents: svc ? Math.max(1, Math.ceil(priceRub * 100 * t.quantity)) : 0
            };
          }
          return t;
        });
      });
    });
  }, []);

  const totalTasks = tasks.length;
  const configuredTasks = tasks.filter(t => t.status === 'configured').length;
  const totalCents = tasks.reduce((sum, t) => sum + (t.priceCents || 0), 0);
  const isReadyToPay = totalTasks > 0 && configuredTasks === totalTasks;

  return {
    tasks,
    catalog,
    addLinks,
    removeTask,
    updateTask,
    applyToAllSamePlatform,
    setTaskConfig,
    loadReorderTask,
    stats: {
       totalTasks,
       configuredTasks,
       totalCents,
       isReadyToPay
    }
  };
}

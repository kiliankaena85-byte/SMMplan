'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  tenantId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class TenantErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[Tenant:${this.props.tenantId}] Render error:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-card border border-border/40 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-foreground">Интерфейс временно недоступен</h2>
              <p className="text-sm text-muted-foreground">
                Произошла ошибка при отрисовке компонента тенанта ({this.props.tenantId}). Попробуйте обновить страницу.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200"
              >
                Обновить страницу
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

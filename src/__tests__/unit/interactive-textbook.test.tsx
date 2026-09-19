/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveTextbook } from '@/components/admin/manual/interactive-textbook/InteractiveTextbook';
import { InteractiveRegexLookup } from '@/components/admin/manual/interactive-textbook/InteractiveRegexLookup';
import { InteractiveErrorCodeLookup } from '@/components/admin/manual/interactive-textbook/InteractiveErrorCodeLookup';
import { InteractiveStepChecklist } from '@/components/admin/manual/interactive-textbook/InteractiveStepChecklist';
import { ALL_TEXTBOOK_CHAPTERS } from '@/components/admin/manual/interactive-textbook/data/textbook-chapters';

describe('Interactive Textbook (OmniBook 2026)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders textbook header, domain pills, and initial chapter according to ГОСТ ЕСПД', () => {
    render(<InteractiveTextbook />);

    expect(screen.getByText(/Интерактивный иллюстрированный учебник OmniBook 2026/i)).toBeTruthy();
    expect(screen.getByText(/1. Область применения и назначение/i)).toBeTruthy();
    expect(screen.getByText(/2. Термины и определения/i)).toBeTruthy();
    expect(screen.getByText(/3. Архитектура и системные связи/i)).toBeTruthy();
    expect(screen.getByText(/Пошаговый регламент штатной эксплуатации/i)).toBeTruthy();
    expect(screen.getByText(/Нестандартные и защитные функции/i)).toBeTruthy();
    expect(screen.getByText(/Диагностика сбоев и план восстановления/i)).toBeTruthy();
  });

  it('filters chapters when clicking domain buttons', () => {
    render(<InteractiveTextbook />);

    // Click "Заказы & Drip" domain pill
    const ordersPill = screen.getByRole('button', { name: /Заказы & Drip/i });
    fireEvent.click(ordersPill);

    const matches = screen.getAllByText(/Реестр заказов, жизненный цикл и Drip-Feed/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('switches between Textbook, RegEx stand, and API error codes view', () => {
    render(<InteractiveTextbook />);

    // Switch to RegEx Stand
    const regexBtn = screen.getByRole('button', { name: /RegEx Стенд/i });
    fireEvent.click(regexBtn);
    expect(screen.getByText(/Интерактивный тестовый стенд RegEx/i)).toBeTruthy();

    // Switch to Error Codes
    const errorsBtn = screen.getByRole('button', { name: /Коды API/i });
    fireEvent.click(errorsBtn);
    expect(screen.getByText(/Справочник кодов ошибок провайдеров API/i)).toBeTruthy();
  });

  it('validates Telegram and VK links in InteractiveRegexLookup', () => {
    render(<InteractiveRegexLookup />);

    const input = screen.getByPlaceholderText(/Вставьте ссылку/i);

    // Test Telegram Channel
    fireEvent.change(input, { target: { value: 'https://t.me/durov' } });
    const matches = screen.getAllByText(/Telegram \(Канал\/Группа\)/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Целевой тип:/i)).toBeTruthy();

    // Test Invalid Link
    fireEvent.change(input, { target: { value: 'https://unknown-site.xyz/123' } });
    expect(screen.getByText(/Формат ссылки не распознан/i)).toBeTruthy();
  });

  it('filters error codes in InteractiveErrorCodeLookup', () => {
    render(<InteractiveErrorCodeLookup />);

    const searchInput = screen.getByPlaceholderText(/Поиск по ошибке/i);
    fireEvent.change(searchInput, { target: { value: 'private' } });

    expect(screen.getByText(/Account \/ Post is private/i)).toBeTruthy();
    expect(screen.queryByText(/Provider balance low/i)).toBeNull();
  });

  it('tracks checklist progress and saves to localStorage', () => {
    const mockItems = [
      { id: 'step-1', title: 'Шаг 1', detail: 'Инструкция 1' },
      { id: 'step-2', title: 'Шаг 2', detail: 'Инструкция 2' },
    ];

    render(<InteractiveStepChecklist chapterId="test-ch" items={mockItems} />);

    expect(screen.getByText(/0 \/ 2 \(0%\)/i)).toBeTruthy();

    // Click step 1
    const step1 = screen.getByText('Шаг 1');
    fireEvent.click(step1);

    expect(screen.getByText(/1 \/ 2 \(50%\)/i)).toBeTruthy();
    expect(localStorage.getItem('omnibook_checklist_test-ch')).toContain('"step-1":true');
  });

  it('verifies all chapters comply with 14 volumes and standards', () => {
    expect(ALL_TEXTBOOK_CHAPTERS.length).toBeGreaterThanOrEqual(8);
    ALL_TEXTBOOK_CHAPTERS.forEach((ch) => {
      expect(ch.id).toBeDefined();
      expect(ch.volumeNumber).toBeGreaterThan(0);
      expect(ch.chapterNumber).toBeGreaterThan(0);
      expect(ch.section1Scope).toBeTruthy();
      expect(ch.section2Terms.length).toBeGreaterThan(0);
      expect(ch.section4Walkthrough.steps.length).toBeGreaterThan(0);
      expect(ch.section5Safeguards.rules.length).toBeGreaterThan(0);
      expect(ch.section6Troubleshooting.length).toBeGreaterThan(0);
      expect(ch.checklist.length).toBeGreaterThan(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PresetPicker from './PresetPicker';
import { useAppStore } from '../store/appStore';
import type { PresetInfo } from '../types';

vi.mock('../services/api', () => ({
  getPresets: vi.fn(),
}));

import { getPresets } from '../services/api';

const presets: PresetInfo[] = [
  {
    id: 'swiss',
    name: { ru: 'Швейцарский', en: 'Swiss' },
    description: { ru: 'Точная сетка и ясная типографика', en: 'Precise grid and clear type' },
    swatch: ['#111111', '#F4F0E8', '#E04A2F'],
  },
  {
    id: 'brutalist',
    name: { ru: 'Брутализм', en: 'Brutalist' },
    description: { ru: 'Крупные блоки и резкий контраст', en: 'Heavy blocks and sharp contrast' },
    swatch: ['#EDEAE2', '#1C1A17', '#D8492F'],
  },
];

beforeEach(() => {
  vi.mocked(getPresets).mockReset();
  useAppStore.setState({ preset: null, isGenerating: false });
});

describe('PresetPicker', () => {
  it('renders only the Auto chip while the catalogue is loading', () => {
    vi.mocked(getPresets).mockReturnValue(new Promise(() => {}));

    render(<PresetPicker />);

    expect(screen.getByRole('radiogroup', { name: 'Выбор стиля' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Авто' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Швейцарский' })).not.toBeInTheDocument();
  });

  it('degrades to the Auto chip when loading the catalogue fails', async () => {
    vi.mocked(getPresets).mockRejectedValue(new Error('offline'));

    render(<PresetPicker />);

    await waitFor(() => expect(getPresets).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('radio', { name: 'Авто' })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.queryByRole('radio', { name: 'Брутализм' })).not.toBeInTheDocument();
  });

  it('renders Auto plus every preset in API order', async () => {
    vi.mocked(getPresets).mockResolvedValue(presets);

    render(<PresetPicker />);

    await screen.findByRole('radio', { name: 'Швейцарский' });
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Авто',
      'Швейцарский',
      'Брутализм',
    ]);
    expect(screen.getByRole('radio', { name: 'Авто' })).toBeChecked();
    expect(screen.getByTestId('preset-description')).toHaveTextContent(
      'Стиль подбирается по промпту',
    );
  });

  it('selects a preset, updates the store and shows its description', async () => {
    vi.mocked(getPresets).mockResolvedValue(presets);
    const user = userEvent.setup();

    render(<PresetPicker />);
    await user.click(await screen.findByRole('radio', { name: 'Брутализм' }));

    expect(useAppStore.getState().preset).toBe('brutalist');
    expect(screen.getByRole('radio', { name: 'Брутализм' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Авто' })).not.toBeChecked();
    expect(screen.getByTestId('preset-description')).toHaveTextContent(
      'Крупные блоки и резкий контраст',
    );

    await user.click(screen.getByRole('radio', { name: 'Авто' }));
    expect(useAppStore.getState().preset).toBeNull();
    expect(screen.getByRole('radio', { name: 'Авто' })).toBeChecked();
  });

  it('reflects the preset already stored on the project', async () => {
    useAppStore.setState({ preset: 'swiss' });
    vi.mocked(getPresets).mockResolvedValue(presets);

    render(<PresetPicker />);

    expect(await screen.findByRole('radio', { name: 'Швейцарский' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Авто' })).not.toBeChecked();
  });

  it('moves the selection with the arrow keys', async () => {
    vi.mocked(getPresets).mockResolvedValue(presets);
    const user = userEvent.setup();

    render(<PresetPicker />);
    const auto = await screen.findByRole('radio', { name: 'Авто' });
    auto.focus();
    await user.keyboard('{ArrowRight}');

    expect(useAppStore.getState().preset).toBe('swiss');
    expect(screen.getByRole('radio', { name: 'Швейцарский' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Швейцарский' })).toBeChecked();
  });

  it('disables every chip while generating', async () => {
    vi.mocked(getPresets).mockResolvedValue(presets);
    useAppStore.setState({ isGenerating: true });

    render(<PresetPicker />);

    await screen.findByRole('radio', { name: 'Швейцарский' });
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });

  it('compact variant opens a listbox and selects a preset', async () => {
    vi.mocked(getPresets).mockResolvedValue(presets);
    const user = userEvent.setup();

    render(<PresetPicker compact />);

    const trigger = screen.getByRole('button', { name: 'Стиль: Авто' });
    expect(trigger).toHaveTextContent('Авто');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(trigger);
    const listbox = screen.getByRole('listbox', { name: 'Выбор стиля' });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText('Стиль подбирается по промпту')).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Брутализм' }));

    expect(useAppStore.getState().preset).toBe('brutalist');
    expect(trigger).toHaveTextContent('Брутализм');
    expect(trigger).toHaveAccessibleName('Стиль: Брутализм');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

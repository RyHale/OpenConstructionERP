import type { BIMElementData } from './ElementManager';

type AggMode = 'sum' | 'avg' | 'distinct';

interface BaseAggResult {
  key: string;
  label: string;
  unit?: string;
  count: number;
  mode: AggMode;
}

export interface SumAggResult extends BaseAggResult {
  mode: 'sum';
  sum: number;
}

export interface AvgAggResult extends BaseAggResult {
  mode: 'avg';
  avg: number;
  min: number;
  max: number;
  uniqueValues: number[];
}

export interface DistinctAggResult extends BaseAggResult {
  mode: 'distinct';
  uniqueValues: number[];
}

export type AggResult = SumAggResult | AvgAggResult | DistinctAggResult;

const ADDITIVE_KEYS = ['area', 'volume', 'length', 'perimeter', 'count', 'quantity'];
const AVERAGE_KEYS = ['height', 'width', 'depth', 'thickness', 'diameter', 'radius', 'slope'];

function labelForKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function unitForKey(key: string): string | undefined {
  const normalized = key.toLowerCase();
  if (normalized.includes('volume')) return 'm3';
  if (normalized.includes('area')) return 'm2';
  if (
    normalized.includes('length') ||
    normalized.includes('height') ||
    normalized.includes('width') ||
    normalized.includes('depth') ||
    normalized.includes('diameter') ||
    normalized.includes('radius') ||
    normalized.includes('thickness')
  ) {
    return 'm';
  }
  return undefined;
}

function modeForKey(key: string, uniqueCount: number, count: number): AggMode {
  const normalized = key.toLowerCase();
  if (ADDITIVE_KEYS.some((part) => normalized.includes(part))) return 'sum';
  if (AVERAGE_KEYS.some((part) => normalized.includes(part))) return 'avg';
  return uniqueCount <= Math.min(12, Math.max(3, count / 2)) ? 'distinct' : 'avg';
}

export function aggregateBIMQuantities(elements: BIMElementData[]): AggResult[] {
  const valuesByKey = new Map<string, number[]>();

  for (const element of elements) {
    for (const [key, value] of Object.entries(element.quantities ?? {})) {
      if (!Number.isFinite(value)) continue;
      const values = valuesByKey.get(key) ?? [];
      values.push(value);
      valuesByKey.set(key, values);
    }
  }

  return [...valuesByKey.entries()]
    .map(([key, values]): AggResult | null => {
      if (values.length === 0) return null;
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
      const count = values.length;
      const mode = modeForKey(key, uniqueValues.length, count);
      const unit = unitForKey(key);
      const label = labelForKey(key);

      if (mode === 'sum') {
        return {
          key,
          label,
          unit,
          count,
          mode,
          sum: values.reduce((total, value) => total + value, 0),
        };
      }

      if (mode === 'distinct') {
        return {
          key,
          label,
          unit,
          count,
          mode,
          uniqueValues,
        };
      }

      return {
        key,
        label,
        unit,
        count,
        mode,
        avg: values.reduce((total, value) => total + value, 0) / count,
        min: Math.min(...values),
        max: Math.max(...values),
        uniqueValues,
      };
    })
    .filter((result): result is AggResult => result !== null)
    .sort((a, b) => {
      const rank = (mode: AggMode) => (mode === 'sum' ? 0 : mode === 'avg' ? 1 : 2);
      const rankDelta = rank(a.mode) - rank(b.mode);
      return rankDelta || a.label.localeCompare(b.label);
    });
}


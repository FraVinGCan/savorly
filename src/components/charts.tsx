import type { CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { plural } from '../lib/format'

type ChartEntry = { label: string; value: number }

type ColourEntry = ChartEntry & { colour: string }

const tooltipStyle: CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
  color: 'var(--color-foreground)',
  fontSize: '0.75rem',
}

const tooltipLabelStyle: CSSProperties = {
  color: 'var(--color-foreground)',
  fontWeight: 600,
}

const tooltipItemStyle: CSSProperties = {
  color: 'var(--color-muted-foreground)',
}

const axisTick = {
  fill: 'var(--color-muted-foreground)',
  fontSize: 10,
}

const CHART_COLOURS = [
  'var(--color-primary, #49633d)',
  '#c2865a',
  '#7b9c8b',
  '#c9ae5c',
  '#8a7ba6',
  '#b0717f',
  '#6c8bb0',
  '#9c8a6d',
]

const noAnimation = false

export function CookTrendChart({
  values,
  ariaLabel,
}: {
  values: number[]
  ariaLabel: string
}) {
  const data = values.map((value, index) => ({
    label:
      index === values.length - 1
        ? 'This week'
        : plural(values.length - 1 - index, 'week ago', 'weeks ago'),
    cooks: value,
  }))

  return (
    <figure className="space-y-2">
      <AreaChart
        data={data}
        responsive
        style={{ width: '100%', height: '7rem' }}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        title={ariaLabel}
        desc="Cooks logged in each of the last eight weeks">
        <YAxis
          hide
          domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
          allowDecimals={false}
        />
        <XAxis dataKey="label" hide />
        <CartesianGrid
          vertical={false}
          stroke="var(--color-primary)"
          strokeOpacity={0.2}
        />
        <Tooltip
          cursor={{ stroke: 'var(--color-primary)', strokeOpacity: 0.3 }}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value) => [plural(Number(value), 'cook'), 'Cooks']}
        />
        <Area
          type="monotone"
          dataKey="cooks"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          fill="var(--color-primary)"
          fillOpacity={0.16}
          dot={{
            r: 3.5,
            fill: 'var(--color-primary)',
            stroke: 'none',
          }}
          activeDot={{
            r: 5,
            fill: 'var(--color-primary)',
            stroke: 'var(--color-card)',
            strokeWidth: 2,
          }}
          isAnimationActive={noAnimation}
        />
      </AreaChart>
      <figcaption className="flex justify-between text-[10px] text-muted-foreground">
        <span>8 weeks ago</span>
        <span>This week</span>
      </figcaption>
    </figure>
  )
}

export function CuisineDonutChart({
  entries,
  centreValue,
  centreLabel,
  ariaLabel,
}: {
  entries: ChartEntry[]
  centreValue: string
  centreLabel: string
  ariaLabel: string
}) {
  const coloured = entries.map((entry, index) => ({
    ...entry,
    colour: CHART_COLOURS[index % CHART_COLOURS.length]!,
  }))
  const total = coloured.reduce((sum, entry) => sum + entry.value, 0) || 1
  const data = coloured.map((entry) => ({ ...entry, fill: entry.colour }))

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-28 shrink-0">
        <PieChart
          responsive
          style={{ width: '100%', height: '100%' }}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          title={ariaLabel}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="64%"
            outerRadius="85%"
            startAngle={90}
            endAngle={-270}
            stroke="var(--color-card)"
            strokeWidth={1}
            isAnimationActive={noAnimation}
          />
          <Tooltip
            wrapperStyle={{ zIndex: 10 }}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(value) => plural(Number(value), 'cook')}
          />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-lg leading-none">
            {centreValue}
          </span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {centreLabel}
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {coloured.map((entry) => (
          <li
            key={entry.label}
            className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: entry.colour }}
              />
              <span className="truncate">{entry.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {entry.value} · {Math.round((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CookedFavouritesChart({
  segments,
  ariaLabel,
}: {
  segments: ColourEntry[]
  ariaLabel: string
}) {
  const [cooked, remaining] = segments
  const cookedValue = cooked?.value ?? 0
  const remainingValue = remaining?.value ?? 0
  const data = [{ cooked: cookedValue, remaining: remainingValue }]

  return (
    <div className="space-y-2">
      <BarChart
        data={data}
        layout="vertical"
        responsive
        barCategoryGap={0}
        style={{ width: '100%', height: '0.75rem' }}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title={ariaLabel}>
        <XAxis
          type="number"
          hide
          domain={[0, Math.max(1, cookedValue + remainingValue)]}
        />
        <YAxis type="category" hide />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value, name) => [Number(value), String(name)]}
        />
        <Bar
          dataKey="cooked"
          stackId="favourites"
          fill={cooked?.colour ?? 'var(--color-primary)'}
          isAnimationActive={noAnimation}
        />
        <Bar
          dataKey="remaining"
          stackId="favourites"
          fill={remaining?.colour ?? '#c2865a'}
          isAnimationActive={noAnimation}
        />
      </BarChart>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((segment) => (
          <li key={segment.label} className="inline-flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: segment.colour }}
            />
            <span>{segment.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ValueColumnsChart({
  entries,
  ariaLabel,
}: {
  entries: ChartEntry[]
  ariaLabel: string
}) {
  return (
    <BarChart
      data={entries}
      responsive
      style={{ width: '100%', height: '7rem' }}
      margin={{ top: 18, right: 0, bottom: 0, left: 0 }}
      title={ariaLabel}>
      <XAxis
        dataKey="label"
        tick={axisTick}
        axisLine={false}
        tickLine={false}
        interval={0}
      />
      <YAxis
        hide
        domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
        allowDecimals={false}
      />
      <Tooltip
        cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.6 }}
        contentStyle={tooltipStyle}
        labelStyle={tooltipLabelStyle}
        itemStyle={tooltipItemStyle}
        formatter={(value) => [Number(value), 'Recipes']}
      />
      <Bar
        dataKey="value"
        fill="var(--color-primary)"
        radius={[6, 6, 0, 0]}
        maxBarSize={48}
        isAnimationActive={noAnimation}>
        <LabelList
          dataKey="value"
          position="top"
          fill="var(--color-muted-foreground)"
          fontSize={10}
        />
      </Bar>
    </BarChart>
  )
}

export function MostCookedBarsChart({
  entries,
  ariaLabel,
}: {
  entries: ChartEntry[]
  ariaLabel: string
}) {
  return (
    <BarChart
      data={entries}
      layout="vertical"
      responsive
      barCategoryGap="25%"
      style={{ width: '100%', height: '7.5rem' }}
      margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
      title={ariaLabel}>
      <XAxis
        type="number"
        hide
        domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
        allowDecimals={false}
      />
      <YAxis
        type="category"
        dataKey="label"
        width={112}
        tick={axisTick}
        tickFormatter={(value: string) =>
          value.length > 18 ? `${value.slice(0, 17)}…` : value
        }
        axisLine={false}
        tickLine={false}
      />
      <Tooltip
        cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.6 }}
        contentStyle={tooltipStyle}
        labelStyle={tooltipLabelStyle}
        itemStyle={tooltipItemStyle}
        formatter={(value) => [plural(Number(value), 'cook'), 'Cooks']}
      />
      <Bar
        dataKey="value"
        fill="var(--color-primary)"
        radius={[0, 4, 4, 0]}
        minPointSize={2}
        isAnimationActive={noAnimation}>
        <LabelList
          dataKey="value"
          position="right"
          fill="var(--color-muted-foreground)"
          fontSize={10}
        />
      </Bar>
    </BarChart>
  )
}

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { zeroOffset } from '../financeUtils';

interface BalancePoint {
    date: number;
    balance: number;
}

interface BalanceChartProps {
    series: BalancePoint[];
    gradientId: string;
    label: string;
    variant?: 'area' | 'line';
    height?: number;
    footer?: React.ReactNode;
}

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: BalancePoint }> }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value as number;
    const d = payload[0].payload.date as number;
    return (
        <div className="bg-black/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
            <div className="text-white/40 mb-0.5">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
            <div className={v >= 0 ? 'text-green-400' : 'text-red-400'}>
                {v >= 0 ? `+£${v.toFixed(2)} credit` : `-£${Math.abs(v).toFixed(2)} owed`}
            </div>
        </div>
    );
};

const BalanceChart: React.FC<BalanceChartProps> = ({
    series, gradientId, label, variant = 'line', height = 72, footer,
}) => {
    if (series.length < 2) return null;
    const zeroPct = zeroOffset(series);

    const sharedProps = {
        data: series,
        margin: { top: 6, right: 6, bottom: 0, left: 6 },
    };

    const gradients = (
        <defs>
            <linearGradient id={`${gradientId}_line`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={zeroPct} stopColor="#22c55e" />
                <stop offset={zeroPct} stopColor="#ef4444" />
            </linearGradient>
            {variant === 'area' && (
                <linearGradient id={`${gradientId}_area`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset={zeroPct} stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset={zeroPct} stopColor="#ef4444" stopOpacity={0.15} />
                </linearGradient>
            )}
        </defs>
    );

    return (
        <div>
            <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">{label}</div>
            <ResponsiveContainer width="100%" height={height}>
                {variant === 'area' ? (
                    <AreaChart {...sharedProps}>
                        {gradients}
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={ChartTooltip} />
                        <ReferenceLine y={0} stroke="white" strokeOpacity={0.1} strokeDasharray="3 2" />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke={`url(#${gradientId}_line)`}
                            strokeWidth={1.8}
                            fill={`url(#${gradientId}_area)`}
                            dot={{ r: 2.5, fill: `url(#${gradientId}_line)`, strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </AreaChart>
                ) : (
                    <LineChart {...sharedProps}>
                        {gradients}
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={ChartTooltip} />
                        <ReferenceLine y={0} stroke="white" strokeOpacity={0.12} strokeDasharray="3 2" />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke={`url(#${gradientId}_line)`}
                            strokeWidth={1.6}
                            dot={{ r: 2.5, strokeWidth: 0, fill: `url(#${gradientId}_line)` }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </LineChart>
                )}
            </ResponsiveContainer>
            {footer}
        </div>
    );
};

export default BalanceChart;

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { useMission } from '../store/missionStore'

export default function EnergyChart() {
  const data = useMission((s) => s.energyHistory)
  return (
    <div className="chart-wrap">
      <header>
        <p>Barramento</p>
        <strong>energia vs. geração</strong>
      </header>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="e" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9e4dc" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#c9e4dc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              background: '#1e151c',
              border: '1px solid #3a2a32',
              fontSize: 12,
            }}
            formatter={(v, n) => [`${Number(v).toFixed(1)}`, n === 'energy' ? 'energia' : 'solar']}
          />
          <Area type="monotone" dataKey="energy" stroke="#c9e4dc" fill="url(#e)" strokeWidth={2} />
          <Area type="monotone" dataKey="solar" stroke="#f2c14e" fill="none" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

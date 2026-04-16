import { useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from "recharts";
import { cn } from "@/lib/utils";

interface ScanData {
  id: string;
  time: string;
  visitNumber: number;
  locationVerified: boolean;
}

interface CustomerData {
  id: string;
  phone: string;
  name: string;
  totalVisits: number;
  stampsRequired: number;
  lastVisit: string;
  scans: ScanData[];
}

interface AnalyticsChartProps {
  customers: CustomerData[];
  className?: string;
}

export const AnalyticsChart = ({ customers, className }: AnalyticsChartProps) => {
  // Generate weekly scan data from customers
  const weeklyData = useMemo(() => {
    const now = new Date();
    const days: { name: string; scans: number; date: Date }[] = [];
    
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      days.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        scans: 0,
        date,
      });
    }
    
    // Count scans per day from customer data
    customers.forEach(customer => {
      customer.scans.forEach(scan => {
        // Parse scan time - it's in format "Today, 12:46 PM" or "Jan 2, 12:30 PM"
        const scanTime = scan.time;
        let scanDate: Date | null = null;
        
        if (scanTime.startsWith("Today")) {
          scanDate = new Date();
        } else if (scanTime.startsWith("Yesterday")) {
          scanDate = new Date();
          scanDate.setDate(scanDate.getDate() - 1);
        } else {
          // Try to parse "Jan 2, 12:30 PM" format
          const match = scanTime.match(/(\w+ \d+)/);
          if (match) {
            const currentYear = new Date().getFullYear();
            scanDate = new Date(`${match[1]}, ${currentYear}`);
          }
        }
        
        if (scanDate) {
          scanDate.setHours(0, 0, 0, 0);
          const dayEntry = days.find(d => d.date.getTime() === scanDate!.getTime());
          if (dayEntry) {
            dayEntry.scans++;
          }
        }
      });
    });
    
    return days.map(d => ({ name: d.name, scans: d.scans }));
  }, [customers]);

  // Generate customer growth data (cumulative)
  const customerGrowthData = useMemo(() => {
    const now = new Date();
    const data: { name: string; customers: number }[] = [];
    const total = customers.length;
    
    // Simulate growth over last 7 days (in reality we'd need created_at data)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Estimate: assume uniform distribution
      const estimated = Math.round(total * ((7 - i) / 7));
      
      data.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        customers: Math.max(estimated, i === 0 ? total : 0),
      });
    }
    
    // Ensure last day shows actual total
    if (data.length > 0) {
      data[data.length - 1].customers = total;
    }
    
    return data;
  }, [customers]);

  const totalWeeklyScans = weeklyData.reduce((sum, d) => sum + d.scans, 0);
  const avgDailyScans = totalWeeklyScans > 0 ? (totalWeeklyScans / 7).toFixed(1) : "0";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Scan Trends Chart */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Weekly Scans</h3>
            <p className="text-sm text-muted-foreground">Last 7 days activity</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalWeeklyScans}</p>
            <p className="text-xs text-muted-foreground">~{avgDailyScans}/day</p>
          </div>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="scans" 
                stroke="hsl(0, 85%, 50%)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorScans)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Growth Chart */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Customer Growth</h3>
            <p className="text-sm text-muted-foreground">Total customers over time</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
            <p className="text-xs text-muted-foreground">total customers</p>
          </div>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={customerGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="customers" 
                stroke="hsl(217, 91%, 60%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(217, 91%, 60%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

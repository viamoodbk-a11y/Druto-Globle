import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Download, ChevronDown, ChevronUp, Phone, Users, Calendar, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Scan {
  id: string;
  time: string;
  visitNumber: number;
  locationVerified: boolean;
  branchName?: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalVisits: number;
  stampsRequired: number;
  lastVisit: string;
  scans?: Scan[];
}

interface CustomersTabProps {
  customers: Customer[];
  restaurantName: string;
}

export const CustomersTab = ({ customers, restaurantName }: CustomersTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (searchQuery) {
      result = result.filter(
        (c) =>
          c.phone.includes(searchQuery) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus === "active") {
      result = result.filter((c) => c.totalVisits < c.stampsRequired);
    } else if (filterStatus === "completed") {
      result = result.filter((c) => c.totalVisits >= c.stampsRequired);
    }

    if (startDate || endDate) {
      result = result.filter((c) => {
        if (!c.scans || c.scans.length === 0) return false;

        return c.scans.some(scan => {
          const scanTime = new Date(scan.time);
          if (startDate && scanTime < new Date(startDate)) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (scanTime > end) return false;
          }
          return true;
        });
      });
    }

    return result;
  }, [customers, searchQuery, filterStatus, startDate, endDate]);

  // Reset display limit when filters change
  useMemo(() => setDisplayLimit(20), [searchQuery, filterStatus]);

  const handleExportCSV = () => {
    const headers = ["Name", "Phone", "Total Visits", "Stamps Required", "Last Visit"];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.phone,
      c.totalVisits.toString(),
      c.stampsRequired.toString(),
      c.lastVisit,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers-${restaurantName}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search and Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by phone or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-40">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 rounded-xl text-xs"
              placeholder="From"
            />
          </div>
          <div className="relative flex-1 sm:w-40">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 rounded-xl text-xs"
              placeholder="To"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="gap-2 h-11 rounded-xl whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", "active", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as typeof filterStatus)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-all capitalize whitespace-nowrap",
              filterStatus === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredCustomers.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground mb-2">No customers yet</h3>
            <p className="text-[13px] text-muted-foreground">
              Share your QR code to start building your customer base
            </p>
          </div>
        ) : (
          filteredCustomers.slice(0, displayLimit).map((customer) => (
            <div
              key={customer.id}
              className="rounded-2xl bg-card shadow-soft overflow-hidden"
            >
              <button
                onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-semibold text-primary">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-[15px]">{customer.name}</p>
                    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {customer.totalVisits}/{customer.stampsRequired}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">stamps</p>
                  </div>
                  {expandedCustomer === customer.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedCustomer === customer.id && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Total Visits</span>
                    <span className="font-medium text-foreground">{customer.totalVisits}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Last Visit</span>
                    <span className="font-medium text-foreground">{customer.lastVisit}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold",
                      customer.totalVisits >= customer.stampsRequired
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}>
                      {customer.totalVisits >= customer.stampsRequired ? "Completed" : "Active"}
                    </span>
                  </div>

                  {/* Scan History */}
                  {customer.scans && customer.scans.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Scan History
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {customer.scans.map((scan, idx) => (
                          <div key={scan.id} className="flex items-center justify-between text-[12px] py-1 px-2 rounded-lg bg-background/60">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono w-5">#{customer.scans!.length - idx}</span>
                              <span className="text-foreground">{scan.time}</span>
                              {scan.branchName && (
                                <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  {scan.branchName}
                                </span>
                              )}
                            </div>
                            {scan.locationVerified && (
                              <MapPin className="h-3 w-3 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {filteredCustomers.length > displayLimit && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => setDisplayLimit(d => d + 20)}
          >
            Load More
          </Button>
        )}
      </div>
    </div>
  );
};

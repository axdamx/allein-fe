import type { ComponentType } from "react";
import {
  BarChart3,
  Bot,
  Calendar,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
  MessageSquare,
  Brain,
  Sparkles,
  Shield,
  Target,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { Brand } from "@/components/brand";
import { PlanBadge } from "@/components/billing/plan-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getLucideIcon } from "@/lib/icons";
import type { PlanTier } from "@/lib/plans";

interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Planner", icon: Calendar, to: "/planner" },
  { label: "Goals", icon: Target, to: "/goals" },
  { label: "Chat", icon: MessageSquare, to: "/chat" },
  { label: "Agents", icon: Bot, to: "/agents" },
  { label: "Studio", icon: Sparkles, to: "/studio" },
  { label: "Knowledge Base", icon: Brain, to: "/knowledge-base" },
  { label: "CRM", icon: Users, to: "/crm/leads" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
];

const footerNav: NavItem[] = [
  { label: "Settings", icon: Settings, to: "/settings" },
  { label: "Support", icon: LifeBuoy, to: "/support" },
];

/** Determine if a nav item matches the current path. */
const isActive = (currentPath: string, to: string): boolean =>
  currentPath === to || currentPath.startsWith(`${to}/`)

export const Sidebar = ({
  userEmail,
  userName,
  userPlan = "free",
  isAdmin = false,
  agentType,
}: {
  userEmail?: string | null;
  userName?: string | null;
  userPlan?: PlanTier;
  isAdmin?: boolean;
  agentType?: {
    key: string;
    label: string;
    icon: string | null;
    accent_color: string;
  } | null;
}) => {
  const displayName =
    userName ?? (userEmail ? userEmail.split("@")[0] : "Guest");
  const initials = displayName.slice(0, 2).toUpperCase();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const AgentIcon = agentType ? getLucideIcon(agentType.icon) : null;

  return (
    <aside className="hidden w-70 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-6">
        <Brand />
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
          General
        </p>
        {mainNav.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            active={isActive(currentPath, item.to)}
          />
        ))}
      </nav>
      <Separator />
      <nav className="flex flex-col gap-1 p-4">
        {footerNav.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            active={isActive(currentPath, item.to)}
          />
        ))}
        {isAdmin && (
          <NavLink
            item={{ label: "Admin", icon: Shield, to: "/admin" }}
            active={isActive(currentPath, "/admin")}
          />
        )}
      </nav>
      <Separator />
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-9">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium capitalize">
            {displayName}
          </p>
          {agentType && (
            <div className="flex items-center gap-1.5">
              {AgentIcon && (
                <AgentIcon
                  className="size-3"
                  style={{ color: agentType.accent_color }}
                />
              )}
              <p
                className="truncate text-xs text-muted-foreground"
                style={{ color: agentType.accent_color }}
              >
                {agentType.label}
              </p>
            </div>
          )}
          {!agentType && (
            <p className="truncate text-xs text-muted-foreground">
              {userEmail ?? "Not signed in"}
            </p>
          )}
        </div>
        <PlanBadge tier={userPlan} className="shrink-0" />
      </div>
    </aside>
  );
}

const NavLink = ({ item, active }: { item: NavItem; active?: boolean }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

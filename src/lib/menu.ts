// lib/menu.ts
import {
  BarChart2,
  Database,
  FileText,
  Layout,
  LayoutDashboard,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react-native";

export const ROLES = ["ADMIN", "EDITOR", "SCHEDULER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  color: string; // warna ikon; latar kotak memakai warna yang sama versi pudar
  allowedRoles: Role[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "#2563eb",
    allowedRoles: ["ADMIN", "EDITOR", "SCHEDULER", "VIEWER"],
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    color: "#7c3aed",
    allowedRoles: ["ADMIN"],
  },
  {
    name: "Sources",
    href: "/sources",
    icon: Database,
    color: "#0891b2",
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    name: "Articles",
    href: "/articles",
    icon: FileText,
    color: "#16a34a",
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    name: "Contents",
    href: "/contents",
    icon: Layout,
    color: "#ea580c",
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    name: "Posts",
    href: "/posts",
    icon: Send,
    color: "#db2777",
    allowedRoles: ["ADMIN", "EDITOR", "SCHEDULER"],
  },
  {
    name: "Post Metrics",
    href: "/post-metrics",
    icon: BarChart2,
    color: "#ca8a04",
    allowedRoles: ["ADMIN", "VIEWER"],
  },
];

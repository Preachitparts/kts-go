
"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Bus,
  BrainCircuit,
  UserCog,
  Settings,
  LogOut,
  UserCircle,
  Map,
  HeartHandshake,
  CalendarClock,
  Globe,
  Armchair,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuth, signOut, onAuthStateChanged, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, createContext, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type UserData = {
    name: string;
    role: string;
} | null;

type AuthContextType = {
  user: User | null;
  userData: UserData;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData({ name: data.name, role: data.role });
                    } else {
                        // This user is authenticated but not in the 'users' collection.
                        // Treat as unauthorized.
                        await signOut(auth);
                        router.push("/admin/login");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Handle error, maybe sign out and redirect
                    await signOut(auth);
                    router.push("/admin/login");
                } finally {
                    setLoading(false);
                }
            } else {
                setUser(null);
                setUserData(null);
                if (pathname !== '/admin/login') {
                    router.push("/admin/login");
                }
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [auth, router, pathname]);
    
    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    )
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </AuthProvider>
  )
}


function LayoutContent({ children }: { children: React.ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = getAuth();
  const { user, userData, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading || !user || !userData) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground rounded-lg p-2">
              <Bus className="size-6" />
            </div>
            <h1 className="text-xl font-bold">KTS Go Admin</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin'}>
                <Link href="/admin">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/bookings'}>
                <Link href="/admin/bookings">
                  <Ticket />
                  Bookings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/sessions'}>
                <Link href="/admin/sessions">
                  <CalendarClock />
                  Sessions
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/booked-seats'}>
                <Link href="/admin/booked-seats">
                  <Armchair />
                  Booked Seats
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/passengers'}>
                <Link href="/admin/passengers">
                  <Users />
                  Passengers
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/regions'}>
                <Link href="/admin/regions">
                  <Globe />
                  Regions
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/routes'}>
                <Link href="/admin/routes">
                  <Map />
                  Routes
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/buses'}>
                <Link href="/admin/buses">
                  <Bus />
                  Buses
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/referrals'}>
                <Link href="/admin/referrals">
                  <HeartHandshake />
                  Referrals
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/anomaly-spotter'}>
                <Link href="/admin/anomaly-spotter">
                  <BrainCircuit />
                  Anomaly Spotter
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/users'}>
                <Link href="/admin/users">
                  <UserCog />
                  Manage Admins
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin/settings'}>
                <Link href="/admin/settings">
                  <Settings />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             <SidebarMenuItem>
                <div className="flex items-center gap-3 p-2">
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>{userData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">{userData.name}</span>
                        <span className="text-xs text-muted-foreground">{userData.role}</span>
                    </div>
                </div>
            </SidebarMenuItem>
             <SidebarMenuItem>
               <SidebarMenuButton onClick={handleLogout}>
                  <LogOut />
                  Logout
                </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger className="md:hidden" />
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <UserCircle />
        </header>
        <main className="p-4 md:p-6 bg-secondary/50 flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

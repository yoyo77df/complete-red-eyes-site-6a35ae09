import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Shield, User as UserIcon, Gamepad2 } from "lucide-react";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={user ? "/dashboard" : "/auth"} className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
          ) : settings === null ? (
            <div className="h-9 w-9 rounded-lg bg-card animate-pulse" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary btn-glow">
              <Gamepad2 className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="text-lg font-bold tracking-tight gradient-text">
            {settings?.site_title ?? ""}
          </span>
        </Link>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8 border border-primary/40">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                <UserIcon className="mr-2 h-4 w-4" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                <Gamepad2 className="mr-2 h-4 w-4" /> Join Form
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" /> Admin Panel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    <Settings className="mr-2 h-4 w-4" /> Site Settings
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

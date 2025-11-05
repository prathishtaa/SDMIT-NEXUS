import { ArrowLeft, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useNavigate, useLocation } from "react-router-dom"
import { authService } from "@/lib/auth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NavbarProps {
  showBack?: boolean
  backTo?: string
}

export function Navbar({ showBack = false, backTo = "/" }: NavbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = authService.getCurrentUser()
  
  console.log('Navbar user data:', user)
  
  const isLandingPage = location.pathname === "/"
  const isAuthenticated = authService.isAuthenticated()

  const getInitials = (name: string) => {
    console.log('Getting initials for name:', name)
    const nameParts = name.trim().split(' ')
    console.log('Name parts:', nameParts)
    if (nameParts.length >= 2) {
      const initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
      console.log('Generated initials:', initials)
      return initials
    }
    const fallback = name.charAt(0).toUpperCase()
    console.log('Fallback initial:', fallback)
    return fallback
  }

  const handleSignOut = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            SDMIT Nexus
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {showBack && !isLandingPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(backTo)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          )}
          
          {isAuthenticated && user && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-accent">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuItem onClick={() => navigate('/user-profile')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Profile & Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { authService } from "@/lib/auth"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { 
  User, Calendar, Building, LogOut, ArrowLeft, Users 
} from "lucide-react"

export default function Profile() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = authService.getCurrentUser()

  const handleSignOut = () => {
    authService.logout()
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    })
    navigate("/login")
  }

  if (!user) {
    navigate("/login")
    return null
  }

  const isStudent = user.role === "student"
  const backTo = isStudent ? "/student-dashboard" : "/lecturer-groups"

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo={backTo} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {isStudent ? "Student Profile" : "Lecturer Profile"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your account information
            </p>
          </div>

          {/* Profile Card */}
          <Card className="shadow-medium">
            <CardHeader className="text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <CardDescription className="text-lg">{user.email}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Student View */}
              {isStudent && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <Building className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Branch</p>
                      <p className="font-semibold">{user.branch || "Not available"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Year</p>
                      <p className="font-semibold">{user.year || "Not available"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Group</p>
                      <p className="font-semibold">
                        {user.branch && user.year ? `${user.branch} - ${user.year}` : "Not available"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer View */}
              {!isStudent && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Groups</p>
                  </div>
                  {user.groups && user.groups.length > 0 ? (
                    <ul className="space-y-2">
                      {user.groups.map((g, i) => (
                        <li 
                          key={i} 
                          className="p-2 bg-muted rounded shadow-sm text-sm font-medium"
                        >
                          Group ID: {g}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No groups assigned</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(backTo)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
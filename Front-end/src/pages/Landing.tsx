import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useNavigate } from "react-router-dom"
import { GraduationCap, Users, Shield, Play } from "lucide-react"

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-16">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              SDMIT Nexus
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Connecting Students, Lecturers, and Admins
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A unified platform for seamless communication, announcements, and document management within the SDMIT community.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="w-full sm:w-auto text-lg px-8 py-3 bg-gradient-primary hover:opacity-90 shadow-medium"
              onClick={() => navigate('/login')}
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              Login
            </Button>
            <Button 
              size="lg" 
              variant="secondary"
              className="w-full sm:w-auto text-lg px-8 py-3"
              onClick={() => navigate('/demo')}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-lg bg-card border shadow-soft">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Student Portal</h3>
            <p className="text-muted-foreground">
              Access group discussions, announcements, and sign important documents seamlessly.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-card border shadow-soft">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Lecturer Dashboard</h3>
            <p className="text-muted-foreground">
              Manage multiple classes, post announcements, and handle document workflows efficiently.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-card border shadow-soft">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Admin Control</h3>
            <p className="text-muted-foreground">
              Complete administrative control over lecturer management and system oversight.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16 p-8 bg-gradient-primary rounded-xl shadow-strong">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/90 text-lg mb-6">
            Join the SDMIT community and experience seamless educational collaboration.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-3"
            onClick={() => navigate('/login')}
          >
            Join SDMIT Nexus
          </Button>
        </div>
      </main>
    </div>
  )
}
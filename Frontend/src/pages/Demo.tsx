import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { useNavigate } from "react-router-dom"
import { Play, Users, GraduationCap, Shield, MessageSquare, FileText, Signature } from "lucide-react"

export default function Demo() {
  const navigate = useNavigate()

  const features = [
    {
      icon: <GraduationCap className="h-8 w-8 text-primary" />,
      title: "Student Dashboard",
      description: "Access group discussions, view announcements, and sign documents.",
      highlights: ["Real-time chat", "Material downloads", "Event updates", "Digital signatures"]
    },
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      title: "Lecturer Portal",
      description: "Manage classes, post materials, and track student engagement.",
      highlights: ["Multi-class management", "Content publishing", "Student analytics", "Document workflows"]
    },
    {
      icon: <Shield className="h-8 w-8 text-secondary-foreground" />,
      title: "Admin Control",
      description: "Complete system oversight with lecturer and system management.",
      highlights: ["User management", "System monitoring", "Access control", "Data insights"]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/" />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            SDMIT Nexus Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore the features that make SDMIT Nexus the ultimate platform for educational collaboration
          </p>
          
          {/* Demo Video Placeholder */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-primary/5 border-primary/20">
              <CardContent className="p-8">
                <div className="aspect-video bg-background rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Play className="h-16 w-16 text-primary mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Demo Video</h3>
                      <p className="text-muted-foreground">Watch how SDMIT Nexus transforms education</p>
                    </div>
                    <Button 
                      size="lg"
                      className="bg-gradient-primary hover:opacity-90"
                      onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Play Demo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Platform Features</h2>
            <p className="text-lg text-muted-foreground">
              Discover how each role experiences SDMIT Nexus
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-medium hover:shadow-strong transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {feature.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm text-muted-foreground">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Key Features Grid */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="text-center p-6 bg-gradient-primary/5 border-primary/20">
            <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Real-time Communication</h3>
            <p className="text-sm text-muted-foreground">
              Instant messaging with students and lecturers in organized group chats
            </p>
          </Card>

          <Card className="text-center p-6 bg-accent/5 border-accent/20">
            <FileText className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Content Management</h3>
            <p className="text-sm text-muted-foreground">
              Organize and distribute educational materials with targeted delivery
            </p>
          </Card>

          <Card className="text-center p-6 bg-secondary/20 border-secondary/30">
            <Signature className="h-12 w-12 text-secondary-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Digital Signatures</h3>
            <p className="text-sm text-muted-foreground">
              Streamlined document signing and verification process
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-primary rounded-xl shadow-strong">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Experience SDMIT Nexus?
              </h2>
              <p className="text-white/90 text-lg mb-6">
                Join thousands of students, lecturers, and administrators already using our platform
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 py-3"
                  onClick={() => navigate('/login')}
                >
                  Get Started Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-3 border-white/20 hover:bg-white/10 text-white"
                  onClick={() => navigate('/')}
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
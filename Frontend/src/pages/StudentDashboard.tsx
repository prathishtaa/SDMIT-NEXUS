import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { MessageCircle, Megaphone, FileText } from "lucide-react"
import { authService } from "@/lib/auth"
import StudentTabs from "@/pages/StudentTabs"

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<"discussion" | "announcements" | "documents" | null>(null)
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  // Friendly greeting
  const hours = new Date().getHours()
  const greeting =
    hours < 12 ? "Good Morning" : hours < 18 ? "Good Afternoon" : "Good Evening"

  // Redirect if not student
  useEffect(() => {
    if (user.role !== "student") {
      navigate("/login")
    }
  }, [user, navigate])

  // Show tabs if a card is clicked
  if (activeTab) {
    return <StudentTabs activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black transition-colors">
      <Navbar showBack backTo="/" />

      <main className="container mx-auto px-4 py-8">
        {/* Friendly Header */}
        <Card className="mb-10 text-center border-0 shadow-md bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-800 dark:to-purple-900 text-white rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold">
              👋 {greeting}, {user?.name}!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="opacity-90">Group: {user?.branch}-{user?.year}</p>
          </CardContent>
        </Card>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          {/* LEFT CARD */}
          <Card
            onClick={() => setActiveTab("discussion")}
            className="group cursor-pointer overflow-hidden rounded-2xl border-0 shadow-xl 
                       transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl 
                       bg-gradient-to-br from-blue-500 to-indigo-500 dark:from-blue-900 dark:to-indigo-950 text-white"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5" />
                Group Discussion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/90">Chat and collaborate with your group.</p>
            </CardContent>
          </Card>

          {/* RIGHT CARD */}
          <Card
            onClick={() => setActiveTab("announcements")}
            className="group cursor-pointer overflow-hidden rounded-2xl border-0 shadow-xl 
                       transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl 
                       bg-gradient-to-br from-pink-500 to-rose-500 dark:from-pink-900 dark:to-rose-950 text-white"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Megaphone className="h-5 w-5" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/90">View study materials and upcoming events.</p>
            </CardContent>
          </Card>

          {/* CENTER CARD */}
          <div className="md:col-span-2 flex justify-center mt-2">
            <Card
              onClick={() => setActiveTab("documents")}
              className="group w-full md:w-1/2 cursor-pointer overflow-hidden rounded-2xl border-0 shadow-xl 
                         transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl 
                         bg-gradient-to-br from-green-500 to-emerald-500 dark:from-green-900 dark:to-emerald-950 text-white"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  Document Signing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90">Review and sign important documents.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

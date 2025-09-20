import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { authService } from "@/lib/auth"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { Plus, GraduationCap } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/services/api"

interface SelectedGroup {
  group_id: string
  branch: string
  year: string
}

export default function LecturerGroups() {
  const [groups, setGroups] = useState<SelectedGroup[]>([])
  const [newGroup, setNewGroup] = useState({ branch: "", year: "" })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()


  const branches = [
    "Artificial Intelligence and Data Science",
    "Computer Science",
    "Information Science",
    "Civil Engineering",
    "Electrical and Electronics",
    "Electronics and Communication",
  ]

  const years = [1, 2, 3, 4]

  // Mapping numeric year to backend format
  const yearMap: Record<string, string> = {
    "1": "1st Year",
    "2": "2nd Year",
    "3": "3rd Year",
    "4": "4th Year",
  }

  // Fetch lecturer groups from backend
  useEffect(() => {
  const user = authService.getCurrentUser()
  if (!user || user.role !== "lecturer") {
    toast({
      title: "Access Denied",
      description: "You are not authorized to access this page.",
      variant: "destructive",
    })
    navigate("/login")
  }
}, [navigate, toast])

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get("/lecturer/groups") 
        setGroups(res.data)
      } catch (err) {
        console.error("Failed to fetch groups", err)
        toast({
          title: "Error",
          description: "Could not fetch your groups. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchGroups()
  }, [])

  // Add or join group
  const handleAddGroup = async () => {
  if (newGroup.branch && newGroup.year) {
    try {
      const res = await api.post("/lecturer/add-groups", {
        branch: newGroup.branch,
        year: newGroup.year,
      })

      const groupExists = groups.some((g) => g.group_id === res.data.id)

      // Only append if not already in state
      if (!groupExists) {
        setGroups((prev) => [...prev, res.data])
      }

      setNewGroup({ branch: "", year: "" })
      setShowAddDialog(false)

      toast({
        title: res.data.message || (groupExists ? "Already joined" : "Group Added"),
        description: `${res.data.branch} - ${res.data.year}`,
      })
    } catch (err: any) {
      console.error("Error adding group", err)
      toast({
        title: "Error",
        description: err.response?.data?.detail || "Could not add group",
        variant: "destructive",
      })
    }
    finally {
      setLoading(false)
    }
  }
}
  // Navigate to lecturer dashboard for specific group
  const handleOpenGroup = (group: SelectedGroup) => {
    navigate(`/lecturer-dashboard/${group.group_id}`, { state: { group } })
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack={false} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Classes</h1>

        {/* Group Cards */}
        {loading ? (
          <p className="text-muted-foreground">Loading groups...</p>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card
                key={group.group_id}
                className="cursor-pointer hover:shadow-lg transition"
                onClick={() => handleOpenGroup(group)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {group.branch}
                  </CardTitle>
                  <CardDescription>{group.year}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Click to open the dashboard for this group.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No groups yet. Add one using the + button.</p>
        )}

        {/* Floating + Button */}
        <Button
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-gradient-primary"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Add Group Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add or Join New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Branch</label>
                <Select
                  value={newGroup.branch}
                  onValueChange={(value) => setNewGroup({ ...newGroup, branch: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Year</label>
                <Select
                  value={newGroup.year}
                  onValueChange={(value) => setNewGroup({ ...newGroup, year: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={yearMap[year.toString()]}>
                        {yearMap[year.toString()]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddGroup}
                disabled={!newGroup.branch || !newGroup.year}
                className="w-full bg-gradient-primary"
              >
                Join Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

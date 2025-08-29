import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { authService } from "@/lib/auth"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { Plus, Users, GraduationCap, BookOpen } from "lucide-react"

interface SelectedGroup {
  branch: string
  year: number
}

export default function LecturerGroups() {
  const [selectedGroups, setSelectedGroups] = useState<SelectedGroup[]>([])
  const [newGroup, setNewGroup] = useState({ branch: '', year: '' })
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const user = authService.getCurrentUser()

  const branches = [
    'Artificial Intelligence & Data Science',
    'Computer Science',
    'Information Science',
    'Civil',
    'Electronics & Communication',
    'Electrical & Electronics'
  ]

  const years = [1, 2, 3, 4]

  const handleAddGroup = () => {
    if (newGroup.branch && newGroup.year) {
      const group: SelectedGroup = {
        branch: newGroup.branch,
        year: parseInt(newGroup.year)
      }
      
      const exists = selectedGroups.some(g => 
        g.branch === group.branch && g.year === group.year
      )
      
      if (!exists) {
        setSelectedGroups([...selectedGroups, group])
        setNewGroup({ branch: '', year: '' })
        toast({
          title: "Group Added",
          description: `Added ${group.branch} - Year ${group.year}`,
        })
      } else {
        toast({
          title: "Group Already Added",
          description: "This group is already in your list.",
          variant: "destructive"
        })
      }
    }
  }

  const handleRemoveGroup = (index: number) => {
    setSelectedGroups(selectedGroups.filter((_, i) => i !== index))
  }

  const handleProceed = () => {
    if (selectedGroups.length === 0) {
      toast({
        title: "No Groups Selected",
        description: "Please add at least one group to continue.",
        variant: "destructive"
      })
      return
    }
    
    // Store selected groups in localStorage for the lecturer dashboard
    localStorage.setItem('lecturer_groups', JSON.stringify(selectedGroups))
    navigate('/lecturer-dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/login" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Group Selection
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome, {user?.name}! Please select the classes you want to manage.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Add New Group</span>
              </CardTitle>
              <CardDescription>
                Select branch and year/semester to add a new class group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Branch</label>
                  <Select value={newGroup.branch} onValueChange={(value) => setNewGroup({...newGroup, branch: value})}>
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
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={newGroup.year} onValueChange={(value) => setNewGroup({...newGroup, year: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          Year {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleAddGroup}
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={!newGroup.branch || !newGroup.year}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </CardContent>
          </Card>

          {selectedGroups.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Selected Groups ({selectedGroups.length})</span>
                </CardTitle>
                <CardDescription>
                  These are the classes you will manage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedGroups.map((group, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <GraduationCap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{group.branch}</p>
                          <p className="text-sm text-muted-foreground">Year {group.year}</p>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRemoveGroup(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <BookOpen className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Ready to start teaching?</h3>
                  <p className="text-muted-foreground">
                    {selectedGroups.length === 0 
                      ? "Add at least one group to continue to your dashboard." 
                      : `You have selected ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}.`
                    }
                  </p>
                </div>
                <Button 
                  onClick={handleProceed}
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90"
                  disabled={selectedGroups.length === 0}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
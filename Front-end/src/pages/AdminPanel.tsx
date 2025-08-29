import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { authService } from "@/lib/auth"
import { dataManager, type Lecturer } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Users, Trash2, Eye, Shield, Settings, Mail } from "lucide-react"

export default function AdminPanel() {
  const [lecturers, setLecturers] = useState<Lecturer[]>(dataManager.getLecturers())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newLecturer, setNewLecturer] = useState({
    name: '',
    email: ''
  })
  const [isSendingPassword, setIsSendingPassword] = useState(false)
  const { toast } = useToast()
  
  const user = authService.getCurrentUser()

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleAddLecturer = () => {
    if (newLecturer.name && newLecturer.email) {
      if (!newLecturer.email.endsWith('@gmail.com')) {
        toast({
          title: "Invalid Email",
          description: "Lecturer email must end with @gmail.com",
          variant: "destructive"
        })
        return
      }

      const generatedPassword = generateRandomPassword()

      dataManager.addLecturer({
        name: newLecturer.name,
        email: newLecturer.email,
        password: generatedPassword
      })
      
      setLecturers(dataManager.getLecturers())
      setNewLecturer({ name: '', email: '' })
      setShowAddDialog(false)
      
      toast({
        title: "Lecturer Added Successfully",
        description: `${newLecturer.name} has been added successfully.`,
      })
    }
  }

  const handleSendPassword = async () => {
    if (!newLecturer.email) {
      toast({
        title: "Email Required",
        description: "Please enter the lecturer's email address first.",
        variant: "destructive"
      })
      return
    }

    if (!newLecturer.email.endsWith('@gmail.com')) {
      toast({
        title: "Invalid Email",
        description: "Lecturer email must end with @gmail.com",
        variant: "destructive"
      })
      return
    }

    setIsSendingPassword(true)
    
    // Simulate API call for sending password
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate network delay
      
      toast({
        title: "Password Sent",
        description: `Temporary password has been sent to ${newLecturer.email}`,
      })
    } catch (error) {
      toast({
        title: "Failed to Send Password",
        description: "There was an error sending the password. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSendingPassword(false)
    }
  }

  const handleDeleteLecturer = (id: string, name: string) => {
    dataManager.deleteLecturer(id)
    setLecturers(dataManager.getLecturers())
    
    toast({
      title: "Lecturer Deleted",
      description: `${name} has been removed from the system.`,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/login" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-muted-foreground">
                Welcome, {user?.name} • System Administrator
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Lecturers</p>
                    <p className="text-2xl font-bold">{lecturers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Status</p>
                    <p className="text-2xl font-bold text-green-600">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Access Level</p>
                    <p className="text-2xl font-bold">Super Admin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="add-lecturer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add-lecturer" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Add Lecturer</span>
            </TabsTrigger>
            <TabsTrigger value="view-lecturers" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>View Lecturers</span>
            </TabsTrigger>
            <TabsTrigger value="manage-lecturers" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manage Lecturers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add-lecturer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Add New Lecturer</span>
                </CardTitle>
                <CardDescription>
                  Create a new lecturer account with access credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter lecturer's full name"
                      value={newLecturer.name}
                      onChange={(e) => setNewLecturer({...newLecturer, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="lecturer@gmail.com"
                        value={newLecturer.email}
                        onChange={(e) => setNewLecturer({...newLecturer, email: e.target.value})}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendPassword}
                        disabled={!newLecturer.email || isSendingPassword}
                        className="whitespace-nowrap"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {isSendingPassword ? "Sending..." : "Send Password"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be a Gmail address (@gmail.com)
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleAddLecturer}
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={!newLecturer.name || !newLecturer.email}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Lecturer
                  </Button>
                </div>
                
                <div className="mt-8 p-4 bg-primary-light rounded-lg">
                  <h4 className="font-medium mb-2">Quick Add (Demo)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    For demonstration purposes, click below to add sample lecturers:
                  </p>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewLecturer({
                        name: 'Dr. Sarah Wilson',
                        email: 'sarah.wilson@gmail.com'
                      })}
                    >
                      Load Sample 1
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewLecturer({
                        name: 'Prof. Michael Brown',
                        email: 'michael.brown@gmail.com'
                      })}
                    >
                      Load Sample 2
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view-lecturers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Lecturer Directory</span>
                </CardTitle>
                <CardDescription>
                  View all registered lecturers in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lecturers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Lecturers Found</h3>
                    <p className="text-muted-foreground">
                      Start by adding your first lecturer in the "Add Lecturer" tab.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lecturers.map((lecturer) => (
                        <TableRow key={lecturer.id}>
                          <TableCell className="font-medium">{lecturer.name}</TableCell>
                          <TableCell>{lecturer.email}</TableCell>
                          <TableCell>
                            <Badge variant="default">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage-lecturers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Manage Lecturers</span>
                </CardTitle>
                <CardDescription>
                  Delete or modify lecturer accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lecturers.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Lecturers to Manage</h3>
                    <p className="text-muted-foreground">
                      Add lecturers first to manage their accounts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lecturers.map((lecturer) => (
                      <div key={lecturer.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{lecturer.name}</p>
                            <p className="text-sm text-muted-foreground">{lecturer.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="default">Active</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteLecturer(lecturer.id, lecturer.name)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
"use client"
import { useEffect, useState } from "react"
import { authService } from "@/lib/auth"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import ConfirmButton from "@/components/Confirmation"
import { Users, Trash2, Shield, Settings, Sun, Moon } from "lucide-react"
import api from "@/services/api"
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  YAxis
} from "recharts"

interface Lecturer {
  id: string
  name: string
  email: string
  status: string
}

interface Student {
  id: number
  usn: string
  name: string
  year: string
  branch: string
}

export default function AdminPanel() {
  const { toast } = useToast()
  const navigate=useNavigate()

  // 🔹 Theme toggle
  const [mode, setMode] = useState<"light" | "dark">("light")

  // 🔹 Lecturer State
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [newLecturer, setNewLecturer] = useState({ name: "", email: "" })
  const [isSendingPassword, setIsSendingPassword] = useState(false)
  const [loading, setLoading] = useState(true)

  // 🔹 Students
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedYear, setSelectedYear] = useState("1st Year")

  // 🔹 Departments
  const [departments, setDepartments] = useState<string[]>([])

  // 🔹 Search
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<string[]>([])

  // 🔹 Charts
  const [studentYearData, setStudentYearData] = useState<any[]>([])
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  const [studentDeptData, setStudentDeptData] = useState<any[]>([])
  const [studentLecturerData, setStudentLecturerData] = useState<any[]>([])
  const [groupData, setGroupData] = useState<any[]>([])
  const user = authService.getCurrentUser()

  useEffect(() => {
    if (user.role !== "admin"){
    toast({
      title: "Access Denied",
      description: "You are not authorized to access this page.",
      variant: "destructive",
    })
      navigate("/login")
    }
  }, [user, navigate,toast])

  // 🔹 Initial Data Fetch
  useEffect(() => {
    fetchLecturers()
    fetchStudents()
    fetchDepartments()
    fetchChartData()
  }, [])

  const fetchLecturers = async () => {
    try {
      setLoading(true)
      const res = await api.get("/admin/get-lecturers")
      setLecturers(res.data)
    } catch {
      toast({ title: "Error", description: "Failed to load lecturers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true)
      const res = await api.get("/admin/student")
      setStudents(res.data)
    } catch {
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" })
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/admin/departments")
      setDepartments(res.data)
    } catch {
      toast({ title: "Error", description: "Failed to load departments", variant: "destructive" })
    }
  }

  const fetchChartData = async () => {
  try {
    const res1 = await api.get("/admin/students/year-distribution")
    const res2 = await api.get("/admin/students/dept-distribution")
    const res3 = await api.get("/admin/students-vs-lecturers")
    const res4 = await api.get("/admin/group-distribution")

    setStudentYearData(res1.data)
    setStudentDeptData(res2.data)
    setStudentLecturerData(res3.data)
    setGroupData(res4.data)
  } catch {
    toast({ title: "Error", description: "Failed to load charts", variant: "destructive" })
  }
}


  const handleAddLecturer = async () => {
    if (!newLecturer.name || !newLecturer.email) return
    try {
      await api.post("/admin/lecturers/add", newLecturer)
      toast({ title: "Lecturer Added", description: `${newLecturer.name} has been added.` })
      setNewLecturer({ name: "", email: "" })
      fetchLecturers()
    } catch {
      toast({ title: "Error", description: "Failed to add lecturer", variant: "destructive" })
    }
  }

  const handleSendPassword = async () => {
    if (!newLecturer.email) return
    setIsSendingPassword(true)
    try {
      await api.post("/admin/lecturers/send-password", { email: newLecturer.email })
      toast({ title: "Password Sent", description: `Temporary password sent to ${newLecturer.email}` })
    } catch {
      toast({ title: "Error", description: "Failed to send password", variant: "destructive" })
    } finally {
      setIsSendingPassword(false)
    }
  }

  const handleDeleteLecturer = async (id: string, name: string) => {
  try {
    await api.delete(`/admin/${id}`) 
    toast({ title: "Deleted", description: `${name} has been removed.` })
    setLecturers((prev) => prev.filter((l) => l.id !== id))
  } catch {
    toast({ title: "Error", description: "Failed to delete lecturer", variant: "destructive" })
  }
}
  const handleSearch = () => {
  const studentMatches = students
    .map((s) => `${s.usn} - ${s.name} `)
    .filter((u) => u.toLowerCase().includes(query.toLowerCase()))

  const lecturerMatches = lecturers
    .map((l) => `${l.name} (${l.email})`)
    .filter((u) => u.toLowerCase().includes(query.toLowerCase()))

  setResults([...studentMatches, ...lecturerMatches])
}


  return (
    <div className={`min-h-screen bg-gradient-subtle ${mode === "dark" ? "dark" : ""}`}>
      <Navbar showBack backTo="/login" />
      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Admin Panel</h1>
              <p className="text-muted-foreground">System Administrator</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMode(mode === "light" ? "dark" : "light")}>
            {mode === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Lecturers</p>
                <p className="text-2xl font-bold">{lecturers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center space-x-2">
              <Settings className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Access Level</p>
                <p className="text-2xl font-bold">Admin</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Students by Year */}
  <Card>
    <CardHeader><CardTitle>Students by Year</CardTitle></CardHeader>
    <CardContent className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={studentYearData} dataKey="value" nameKey="name" outerRadius={80} label>
            {studentYearData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>

  {/* Students by Department */}
  <Card>
    <CardHeader><CardTitle>Students by Department</CardTitle></CardHeader>
    <CardContent className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={studentDeptData} dataKey="value" nameKey="name" outerRadius={80} label>
            {studentDeptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>

  {/* Students vs Lecturers */}
  <Card className="col-span-1 md:col-span-2">
    <CardHeader><CardTitle>Total Students vs Lecturers</CardTitle></CardHeader>
    <CardContent className="h-80">
      <ResponsiveContainer>
        <BarChart data={studentLecturerData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" /><YAxis />
          <Tooltip /><Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>

  {/* Students & Lecturers by Group */}
  <Card className="col-span-1 md:col-span-2">
    <CardHeader><CardTitle>Students & Lecturers by Group</CardTitle></CardHeader>
    <CardContent className="h-80">
      <ResponsiveContainer>
        <BarChart data={groupData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" /><YAxis />
          <Tooltip /><Legend />
          <Bar dataKey="students" fill="#82ca9d" />
          <Bar dataKey="lecturers" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
</div>

        {/* Search */}
        <Card>
          <CardHeader><CardTitle>Search User</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Enter name, USN, or email" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button onClick={handleSearch}>Search</Button>
            </div>
            {results.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {results.map((r, idx) => <li key={idx} className="text-sm">{r}</li>)}
              </ul>
            ) : query && <p className="text-sm text-muted-foreground">No users found.</p>}
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="add-lecturer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="add-lecturer">Add Lecturer</TabsTrigger>
            <TabsTrigger value="view-lecturers">View Lecturers</TabsTrigger>
            <TabsTrigger value="manage-lecturers">Manage Lecturers</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          {/* Add Lecturer */}
          <TabsContent value="add-lecturer">
            <Card>
              <CardHeader>
                <CardTitle>Add New Lecturer</CardTitle>
                <CardDescription>Create a new lecturer account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md space-y-4">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={newLecturer.name} onChange={(e) => setNewLecturer({ ...newLecturer, name: e.target.value })} placeholder="Lecturer's name" />
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex space-x-2">
                    <Input id="email" type="email" value={newLecturer.email} onChange={(e) => setNewLecturer({ ...newLecturer, email: e.target.value })} placeholder="lecturer@example.com" />
                    <Button onClick={handleSendPassword} disabled={isSendingPassword}>{isSendingPassword ? "Sending..." : "Send Password"}</Button>
                  </div>
                  <Button onClick={handleAddLecturer} disabled={!newLecturer.name || !newLecturer.email}>Add Lecturer</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* View Lecturers */}
          <TabsContent value="view-lecturers">
            <Card>
              <CardHeader><CardTitle>Lecturer Directory</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p>Loading...</p> : lecturers.length === 0 ? (
                  <p>No lecturers found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lecturers.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.name}</TableCell>
                          <TableCell>{l.email}</TableCell>
                          <TableCell><Badge>{l.status || "Active"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Lecturers */}
          <TabsContent value="manage-lecturers">
            <Card>
              <CardHeader><CardTitle>Manage Lecturers</CardTitle></CardHeader>
              <CardContent>
                {lecturers.map((lecturer) => (
                  <div key={lecturer.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                    <div>
                      <p className="font-medium">{lecturer.name}</p>
                      <p className="text-sm text-muted-foreground">{lecturer.email}</p>
                    </div>
                    <ConfirmButton
                      label="Delete"
                      onConfirm={() => handleDeleteLecturer(lecturer.id,lecturer.name)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students */}
<TabsContent value="students">
  <Card>
    <CardHeader><CardTitle>Students</CardTitle></CardHeader>
    <CardContent>
      <div className="mb-4">
        <label className="mr-2 font-medium">Select Year:</label>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)} 
          className="border rounded px-3 py-1"
        >
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
        </select>
      </div>

      {loadingStudents ? <p>Loading...</p> : (
        departments.length > 0 ? (
          <Tabs defaultValue={departments[0]}>
            <TabsList>
              {departments.map((dept) => (
                <TabsTrigger key={dept} value={dept}>{dept}</TabsTrigger>
              ))}
            </TabsList>
            {departments.map((dept) => (
              <TabsContent key={dept} value={dept}>
                <ul className="list-disc pl-5">
                  {students
                    .filter((s) => s.year === selectedYear && s.branch === dept)
                    .map((s) => (
                      <li key={s.id}>{s.usn} - {s.name}</li>
                  ))}
                </ul>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p>No departments found.</p>
        )
      )}
    </CardContent>
  </Card>
</TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
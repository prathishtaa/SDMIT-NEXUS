import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Demo from "./pages/Demo";
import FaceRegistration from "./pages/FaceRegistration";
import StudentDashboard from "./pages/StudentDashboard";
import LecturerGroups from "./pages/LecturerGroups";
import LecturerDashboard from "./pages/LecturerDashboard";
import AdminPanel from "./pages/AdminPanel";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="sdmit-nexus-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>

            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/face-registration" element={<FaceRegistration />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/lecturer-groups" element={<LecturerGroups />} />
            <Route path="/lecturer-dashboard" element={<LecturerDashboard />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/user-profile" element={<UserProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

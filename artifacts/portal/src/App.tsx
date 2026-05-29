import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthGuard } from "@/components/auth-guard";
import { AppLayout } from "@/components/layout";
import { ChatProvider } from "@/lib/chat-context";
import { ChatPanelHost } from "@/components/chat-panel-host";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ForceChangePasswordPage from "@/pages/force-change-password";
import CommunityPage from "@/pages/community";
import SchoolPage from "@/pages/school";
import SchoolSegmentPage from "@/pages/school-segment";
import SchoolSubsectionPage from "@/pages/school-subsection";
import SchoolLessonPage from "@/pages/school-lesson";
import MembersPage from "@/pages/members";
import LeaderboardsPage from "@/pages/leaderboards";
import CalendarPage from "@/pages/calendar";
import AboutPage from "@/pages/about";

import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminChannels from "@/pages/admin/channels";
import AdminGroupPage from "@/pages/admin/group";
import AdminReposPage from "@/pages/admin/repos";
import SuggestionsPage from "@/pages/suggestions";
import SavedPage from "@/pages/saved";
import AdminSegments from "@/pages/admin/segments";
import AdminSubsections from "@/pages/admin/subsections";
import AdminLessons from "@/pages/admin/lessons";
import AdminProgress from "@/pages/admin/progress";
import { TermsPage, PrivacyPage } from "@/pages/legal";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/force-change-password">
        <AuthGuard>
          <ForceChangePasswordPage />
        </AuthGuard>
      </Route>

      <Route path="/community/:channelId?">
        <AuthGuard>
          <AppLayout>
            <CommunityPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/school">
        <AuthGuard>
          <AppLayout>
            <SchoolPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/school/segments/:id">
        <AuthGuard>
          <AppLayout>
            <SchoolSegmentPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/school/subsections/:id">
        <AuthGuard>
          <AppLayout>
            <SchoolSubsectionPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/school/lessons/:id">
        <AuthGuard>
          <AppLayout>
            <SchoolLessonPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/members">
        <AuthGuard>
          <AppLayout>
            <MembersPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/leaderboards">
        <AuthGuard>
          <AppLayout>
            <LeaderboardsPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/calendar">
        <AuthGuard>
          <AppLayout>
            <CalendarPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/about">
        <AuthGuard>
          <AppLayout>
            <AboutPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminDashboard />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/group">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminGroupPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/repos">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminReposPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/suggestions">
        <AuthGuard>
          <AppLayout>
            <SuggestionsPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/saved">
        <AuthGuard>
          <AppLayout>
            <SavedPage />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/users">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminUsers />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/channels">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminChannels />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/school/segments">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminSegments />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/school/subsections">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminSubsections />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/school/lessons">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminLessons />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin/progress">
        <AuthGuard requireAdmin>
          <AppLayout>
            <AdminProgress />
          </AppLayout>
        </AuthGuard>
      </Route>

      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChatProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <ChatPanelHost />
          <Toaster />
        </ChatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout";

import CommunityPage from "@/pages/community";
import SchoolPage from "@/pages/school";
import SchoolSubsectionPage from "@/pages/school-subsection";
import SchoolLessonPage from "@/pages/school-lesson";

import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminChannels from "@/pages/admin/channels";
import AdminSegments from "@/pages/admin/segments";
import AdminSubsections from "@/pages/admin/subsections";
import AdminLessons from "@/pages/admin/lessons";
import AdminProgress from "@/pages/admin/progress";

const queryClient = new QueryClient();

function RedirectToCommunity() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/community");
  }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RedirectToCommunity} />

      <Route path="/community/:channelId?">
        <AppLayout>
          <CommunityPage />
        </AppLayout>
      </Route>

      <Route path="/school">
        <AppLayout>
          <SchoolPage />
        </AppLayout>
      </Route>

      <Route path="/school/subsections/:id">
        <AppLayout>
          <SchoolSubsectionPage />
        </AppLayout>
      </Route>

      <Route path="/school/lessons/:id">
        <AppLayout>
          <SchoolLessonPage />
        </AppLayout>
      </Route>

      <Route path="/admin">
        <AppLayout>
          <AdminDashboard />
        </AppLayout>
      </Route>

      <Route path="/admin/users">
        <AppLayout>
          <AdminUsers />
        </AppLayout>
      </Route>

      <Route path="/admin/channels">
        <AppLayout>
          <AdminChannels />
        </AppLayout>
      </Route>

      <Route path="/admin/school/segments">
        <AppLayout>
          <AdminSegments />
        </AppLayout>
      </Route>

      <Route path="/admin/school/subsections">
        <AppLayout>
          <AdminSubsections />
        </AppLayout>
      </Route>

      <Route path="/admin/school/lessons">
        <AppLayout>
          <AdminLessons />
        </AppLayout>
      </Route>

      <Route path="/admin/progress">
        <AppLayout>
          <AdminProgress />
        </AppLayout>
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

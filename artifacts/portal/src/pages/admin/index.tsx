import { Link } from "wouter";
import { Users, Hash, BookOpen, Layers, FileText, LineChart, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const sections = [
    {
      title: "Users",
      description: "Manage portal members and admins",
      icon: Users,
      href: "/admin/users",
      color: "text-blue-500"
    },
    {
      title: "Channels",
      description: "Community discussion channels",
      icon: Hash,
      href: "/admin/channels",
      color: "text-indigo-500"
    },
    {
      title: "Segments",
      description: "Top-level school categories",
      icon: BookOpen,
      href: "/admin/school/segments",
      color: "text-emerald-500"
    },
    {
      title: "Subsections",
      description: "Groupings of lessons within segments",
      icon: Layers,
      href: "/admin/school/subsections",
      color: "text-teal-500"
    },
    {
      title: "Lessons",
      description: "Individual learning materials",
      icon: FileText,
      href: "/admin/school/lessons",
      color: "text-cyan-500"
    },
    {
      title: "Progress",
      description: "Member completion tracking",
      icon: LineChart,
      href: "/admin/progress",
      color: "text-amber-500"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-8 flex items-center gap-3">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Control</h1>
          <p className="text-muted-foreground">Manage the portal content and members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.title} href={section.href}>
            <Card className="h-full hover:bg-muted/50 transition-colors border-border shadow-sm cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-md bg-background border border-border group-hover:scale-110 transition-transform ${section.color}`}>
                    <section.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

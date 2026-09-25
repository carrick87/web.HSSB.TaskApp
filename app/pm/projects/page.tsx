import { requireRole } from "@/lib/auth";
import { getProjects } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

export default async function ProjectsPage() {
  await requireRole(["admin", "pic"]);
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Projects
        </h2>
        <Link
          href="/pm/projects/new"
          className="rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No projects yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/pm/projects/${project.id}`}
              className="block"
            >
              <Card className="h-full hover:shadow-md transition">
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {project.members?.length ?? 0} members
                    </span>
                    <span>
                      Created by {project.creator?.username ?? "Unknown"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

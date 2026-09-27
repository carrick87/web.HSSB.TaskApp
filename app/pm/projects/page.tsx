import { requireOrgManagerOrAbove } from "@/lib/auth";
import { getProjects } from "@/lib/projects";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ProjectsPage() {
  await requireOrgManagerOrAbove();
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">Projects</h1>
          <p className="text-sm text-neutral-700 mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/pm/projects/new"
          className="inline-flex items-center justify-center h-9 px-4 rounded-atlassian bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors shadow-atlassian-sm"
        >
          Create Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Projects group related tasks for your team. Create one when you are ready — no branch setup required."
          actionLabel="Create project"
          actionHref="/pm/projects/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/pm/projects/${project.id}`}
              className="block group"
            >
              <Card className="h-full hover:shadow-atlassian-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-atlassian flex items-center justify-center shrink-0">
                      <span className="font-bold text-sm">
                        {project.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-neutral-1000 group-hover:text-brand-700 transition-colors truncate">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-neutral-700 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                    <div className="flex items-center gap-1 text-xs text-neutral-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {project.members?.length ?? 0}
                    </div>
                    <span className="text-xs text-neutral-400">
                      by {project.creator?.username ?? "Unknown"}
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

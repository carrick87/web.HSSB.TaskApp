# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are office staff, managers, and administrators at Harrison Sabah Sdn Bhd (a Malaysian company). They access the app primarily on mobile phones in various conditions (office, warehouse, on-site), with some desktop use for administrative tasks. The user base is not technically sophisticated and expects simple, clear interfaces.

## Product Purpose

TaskApp is an internal task management system that enables assigning, tracking, and completing tasks and projects. Success means staff complete daily tasks on time, managers can verify work completion, and the organization maintains visibility into task status across departments.

## Positioning

A purpose-built internal task manager for Harrison Sabah's specific workflow: daily task assignment from templates, verification by PICs (Persons In Charge), points-based gamification via leaderboards, and project management with Kanban boards.

## Operating Context

- Daily tasks auto-generated from templates each morning
- Staff receive and complete tasks, submit for verification
- PICs (managers) verify completed tasks
- Points awarded for completion, tracked on monthly leaderboards
- Project management for longer-term collaborative work
- Mobile-first usage, often on phones during work activities
- PWA installation for quick access without app stores

## Capabilities and Constraints

- Authentication via username/password (Supabase Auth)
- Role-based access: admin, pic (person in charge), member
- Daily task templates auto-assign to staff
- Task verification workflow: pending → accepted → submitted → verified/rejected
- Project management with Kanban boards (todo/in_progress/done)
- File attachments for task evidence
- Leaderboard with monthly point rankings
- Export to Excel for reporting
- PWA with offline page (no cached task data for security)

## Brand Commitments

- Name: TaskApp
- Visual direction: Atlassian/Jira-inspired professional aesthetic
- Primary brand color: #0052CC (Atlassian blue)
- Clean, functional, readable on all device sizes

## Evidence on Hand

- Company name: Harrison Sabah Sdn Bhd
- Email domain: @harrisons.com.my
- Logo: "HS" initials used as placeholder
- No external illustrations or photography assets

## Product Principles

1. **Clarity over decoration**: Every element must be instantly readable on a phone screen in bright daylight or dim conditions
2. **Task completion first**: The UI optimizes for quickly completing and verifying daily work
3. **Mobile-native experience**: Touch-friendly, thumb-reachable, works in PWA mode with notch/safe-area handling
4. **Role-appropriate access**: Show users only what they can act on

## Accessibility & Inclusion

WCAG AA compliance required. All text must meet 4.5:1 contrast for body text, 3:1 for large text and UI components. App must work regardless of OS light/dark mode setting (standardized light theme).

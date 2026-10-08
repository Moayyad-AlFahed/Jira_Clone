import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}?schema=public`,
});

const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = 'Password123';

const statuses = [
  {
    name: 'To Do',
    description: 'Work that has not been started.',
    type: 'TODO' as const,
  },
  {
    name: 'In Progress',
    description: 'Work that is currently being done.',
    type: 'IN_PROGRESS' as const,
  },
  {
    name: 'Done',
    description: 'Work that has been completed.',
    type: 'DONE' as const,
  },
];

const users = [
  {
    username: 'ahmed',
    firstName: 'Ahmed',
    lastName: 'Darwin',
    email: 'ahmed@dev.com',
  },
  {
    username: 'sara',
    firstName: 'Sara',
    lastName: 'Ali',
    email: 'sara@dev.com',
  },
  {
    username: 'mohamed',
    firstName: 'Mohamed',
    lastName: 'Hassan',
    email: 'mohamed@dev.com',
  },
  {
    username: 'omar',
    firstName: 'Omar',
    lastName: 'Khaled',
    email: 'omar@dev.com',
  },
];

interface TaskSeed {
  name: string;
  description: string;
  status: string;
  sprint: string;
  assignee: string;
  dueDate: Date;
}

const tasks: TaskSeed[] = [
  {
    name: 'Set up project repository',
    description: 'Initialize the repository and CI/CD pipeline.',
    status: 'Done',
    sprint: 'Sprint 1',
    assignee: 'Ahmed',
    dueDate: new Date('2026-09-01'),
  },
  {
    name: 'Design database schema',
    description: 'Create the initial Prisma schema for all entities.',
    status: 'Done',
    sprint: 'Sprint 1',
    assignee: 'Sara',
    dueDate: new Date('2026-09-03'),
  },
  {
    name: 'Implement authentication',
    description: 'Add JWT-based login and registration endpoints.',
    status: 'In Progress',
    sprint: 'Sprint 1',
    assignee: 'Ahmed',
    dueDate: new Date('2026-09-08'),
  },
  {
    name: 'Build project CRUD',
    description: 'Create endpoints to manage projects.',
    status: 'In Progress',
    sprint: 'Sprint 2',
    assignee: 'Mohamed',
    dueDate: new Date('2026-09-10'),
  },
  {
    name: 'Add sprint management',
    description: 'Support creating and updating sprints for a project.',
    status: 'To Do',
    sprint: 'Sprint 2',
    assignee: 'Sara',
    dueDate: new Date('2026-09-15'),
  },
  {
    name: 'Task board view',
    description: 'Implement the kanban board for tasks.',
    status: 'To Do',
    sprint: 'Sprint 2',
    assignee: 'Mohamed',
    dueDate: new Date('2026-09-18'),
  },
  {
    name: 'Team roles and permissions',
    description: 'Enforce ADMIN/MEMBER/VIEWER permissions on project actions.',
    status: 'In Progress',
    sprint: 'Sprint 3',
    assignee: 'Ahmed',
    dueDate: new Date('2026-09-22'),
  },
  {
    name: 'Notification service',
    description: 'Notify members of task and sprint changes.',
    status: 'To Do',
    sprint: 'Sprint 3',
    assignee: 'Omar',
    dueDate: new Date('2026-09-25'),
  },
  {
    name: 'Write integration tests',
    description: 'Add integration tests covering project and task flows.',
    status: 'To Do',
    sprint: 'Sprint 3',
    assignee: 'Sara',
    dueDate: new Date('2026-09-28'),
  },
];

async function seedStatuses(): Promise<Map<string, number>> {
  const statusIdsByName = new Map<string, number>();
  for (const status of statuses) {
    const existing = await prisma.status.findFirst({
      where: { name: status.name },
    });
    let statusId: number;
    if (existing) {
      statusId = existing.id;
    } else {
      const created = await prisma.status.create({ data: status });
      statusId = created.id;
    }
    statusIdsByName.set(status.name, statusId);
  }
  return statusIdsByName;
}

async function seedUsers(): Promise<{
  byEmail: Map<string, { id: number; email: string }>;
  byName: Map<string, { id: number; email: string }>;
}> {
  const byEmail = new Map<string, { id: number; email: string }>();
  const byName = new Map<string, { id: number; email: string }>();
  const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);
  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      create: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        hashPassword: passwordHash,
      },
    });
    byEmail.set(created.email, { id: created.id, email: created.email });
    byName.set(created.firstName.toLowerCase(), {
      id: created.id,
      email: created.email,
    });
  }
  return { byEmail, byName };
}

const sprintDefs = [
  {
    name: 'Sprint 1',
    status: 'Done',
    start: new Date('2026-08-28'),
    end: new Date('2026-09-11'),
  },
  {
    name: 'Sprint 2',
    status: 'In Progress',
    start: new Date('2026-09-12'),
    end: new Date('2026-09-25'),
  },
  {
    name: 'Sprint 3',
    status: 'To Do',
    start: new Date('2026-09-26'),
    end: new Date('2026-10-09'),
  },
];

const memberships: { email: string; role: 'ADMIN' | 'MEMBER' | 'VIEWER' }[] = [
  { email: 'ahmed@dev.com', role: 'ADMIN' },
  { email: 'sara@dev.com', role: 'MEMBER' },
  { email: 'mohamed@dev.com', role: 'MEMBER' },
  { email: 'omar@dev.com', role: 'VIEWER' },
];

async function seedProjectAndRelated(
  statusIdsByName: Map<string, number>,
  usersByEmail: Map<string, { id: number; email: string }>,
  usersByName: Map<string, { id: number; email: string }>,
) {
  const existingProjectBase = await prisma.baseEntity.findFirst({
    where: { name: 'Test Project' },
  });

  if (existingProjectBase) {
    console.log('Test Project already exists, skipping project data.');
    return;
  }

  const projectBase = await prisma.baseEntity.create({
    data: {
      name: 'Test Project',
      description: 'A project used to demonstrate the Jira clone features.',
      statusId: statusIdsByName.get('In Progress') ?? null,
    },
  });

  const project = await prisma.project.create({
    data: { baseEntityId: projectBase.id },
  });

  const sprintsByName = new Map<string, number>();
  for (const sprint of sprintDefs) {
    const base = await prisma.baseEntity.create({
      data: {
        name: sprint.name,
        description: null,
        statusId: statusIdsByName.get(sprint.status) ?? null,
      },
    });
    const record = await prisma.sprint.create({
      data: {
        projectId: project.id,
        baseEntityId: base.id,
        startDate: sprint.start,
        endDate: sprint.end,
      },
    });
    sprintsByName.set(sprint.name, record.id);
  }

  for (const member of memberships) {
    const user = usersByEmail.get(member.email);
    if (!user) continue;
    await prisma.projectUsers.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      update: {},
      create: {
        projectId: project.id,
        userId: user.id,
        role: member.role,
      },
    });
  }

  for (const task of tasks) {
    const assignee = usersByName.get(task.assignee.toLowerCase());
    const sprintId = sprintsByName.get(task.sprint) ?? null;
    const base = await prisma.baseEntity.create({
      data: {
        name: task.name,
        description: task.description,
        statusId: statusIdsByName.get(task.status) ?? null,
      },
    });
    await prisma.task.create({
      data: {
        baseEntityId: base.id,
        sprintId,
        projectId: project.id,
        userId: assignee?.id ?? null,
        dueDate: task.dueDate,
      },
    });
  }

  console.log('Seeded Test Project with sprints, members and tasks.');
}

async function main() {
  const statusIdsByName = await seedStatuses();
  const { byEmail, byName } = await seedUsers();
  await seedProjectAndRelated(statusIdsByName, byEmail, byName);

  const [
    statusCount,
    userCount,
    projectCount,
    sprintCount,
    taskCount,
    membershipCount,
  ] = await Promise.all([
    prisma.status.count(),
    prisma.user.count(),
    prisma.project.count(),
    prisma.sprint.count(),
    prisma.task.count(),
    prisma.projectUsers.count(),
  ]);

  console.log('Seed completed:', {
    statuses: statusCount,
    users: userCount,
    projects: projectCount,
    sprints: sprintCount,
    tasks: taskCount,
    memberships: membershipCount,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { Task } from "./models";
import { BaseState } from "./auth";
import { TaskStep } from "@/lib/taskSteps";

export interface TaskState extends BaseState {
  task: Task | null;
  date: Date | undefined;
  userLabels: string[];
}

export interface TaskOperations {
  setDate: (date: Date | undefined) => void;
  updateTask: (updates: Partial<Task>) => void;
  saveTask: (taskToSave?: Task) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  removeImage: () => Promise<void>;
  breakDownTask: () => Promise<void>;
  saveSteps: (steps: TaskStep[]) => Promise<void>;
  savePriority: (priority: string) => Promise<void>;
}

export interface TasksState extends BaseState {
  tasks: Task[];
}

export interface TasksOperations {
  createTask: (title: string, description: string) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskComplete: (taskId: string, completed: boolean) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export type UseTaskManagerReturn = TaskState &
  TasksState &
  TaskOperations &
  TasksOperations;
export type UseTaskReturn = TaskState & TaskOperations;
export type UseTasksReturn = TasksState & TasksOperations;

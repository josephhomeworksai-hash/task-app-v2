"use client";

import { useState } from "react";
import { useTaskManager } from "@/hooks/useTaskManager";
import { Button } from "@/components/ui/button";
import TaskList from "@/components/TaskList";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { PlusCircle, ClipboardList } from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { createTask, refreshTasks, tasks, deleteTask, toggleTaskComplete } =
    useTaskManager();
  const { toast } = useToast();

  // Show a message when deleting or ticking a task fails, instead of failing
  // silently.
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      await toggleTaskComplete(taskId, completed);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = async (title: string, description: string) => {
    await createTask(title, description);
    await refreshTasks();
    console.log(`New Task Created: ${title}`);
    setIsDialogOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold whitespace-nowrap">
          Your Tasks
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Enter the details for your new task below.
              </DialogDescription>
            </DialogHeader>
            <CreateTaskForm onSubmit={handleCreateTask} />
          </DialogContent>
        </Dialog>
      </div>
      {tasks.length > 0 ? (
        <div className="border rounded-md">
          <TaskList
            tasks={tasks}
            onDelete={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
          />
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-gray-400 mb-4" />
          <p className="text-gray-500">Create a Task to get started.</p>
        </div>
      )}
    </div>
  );
}

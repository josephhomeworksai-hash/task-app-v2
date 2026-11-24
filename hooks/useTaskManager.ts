import { useState, useEffect } from "react";
import { Task } from "@/types/models";
import { createBrowserClient } from '@supabase/ssr'
import {
  TaskState,
  TasksState,
  TaskOperations,
  TasksOperations,
} from "@/types/taskManager";
import { TaskStep } from "@/lib/taskSteps";
import { format } from "date-fns";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// A due date is a calendar day. Read the day as written, so it doesn't shift
// to the day before in time zones behind UTC.
function parseDueDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
const FUNCTION_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-task-with-ai`;
const BREAK_DOWN_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/break-down-task`;

interface UseTaskManagerReturn
  extends TaskState,
    TasksState,
    TaskOperations,
    TasksOperations {}

export function useTaskManager(taskId?: string): UseTaskManagerReturn {
  // State for single task management
  const [task, setTask] = useState<Task | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [userLabels, setUserLabels] = useState<string[]>([]);

  // State for task list management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Fetch single task
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("task_id", taskId)
          .single();

        if (error) throw error;
        setTask(task);
        setDate(parseDueDate(task.due_date));
      } catch (error: any) {
        console.error(`Error fetching task ID ${taskId}:`, error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  // Fetch the labels the user has used (for the label drop-down).
  // Row Level Security limits this to the user's own tasks.
  useEffect(() => {
    if (!taskId) return;

    const fetchUserLabels = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("label")
        .not("label", "is", null);

      if (error) {
        console.error("Error fetching labels:", error);
        return;
      }
      const used = (data || []).map((row) => row.label as string);
      setUserLabels(Array.from(new Set(used)).sort());
    };

    fetchUserLabels();
  }, [taskId]);

  // Fetch all tasks
  useEffect(() => {
    if (taskId) return; // Don't fetch all tasks if we're managing a single task
    fetchTasks();
  }, []);

  // Single task operations
  const updateTask = (updates: Partial<Task>) => {
    setTask((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const saveTask = async (taskToSave?: Task) => {
    try {
      const taskData = taskToSave || task;
      if (!taskData) throw new Error("No task data to save");

      const { error } = await supabase
        .from("tasks")
        .update({
          ...taskData,
          // null clears a due date that was removed.
          due_date: date ? format(date, "yyyy-MM-dd") : null,
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskData.task_id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving task:", error);
      setError(error.message);
      throw error;
    }
  };

  const uploadImage = async (file: File) => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size must be less than 1MB");
      }

      if (!task) throw new Error("No task found");

      const fileExt = file.name.split(".").pop();
      // A new name for every upload, so browsers never show a cached old image.
      const fileName = `${task.user_id}/${task.task_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          duplex: "half",
          headers: {
            "content-length": file.size.toString(),
          },
        });

      if (uploadError) throw uploadError;

      const updatedTask = { ...task, image_url: fileName };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setError(error.message);
      throw error;
    }
  };

  const removeImage = async () => {
    try {
      if (!task?.image_url) throw new Error("No image to remove");

      const fileName = task.image_url;
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([fileName]);

      if (storageError) throw storageError;

      const updatedTask = { ...task, image_url: null };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (error: any) {
      console.error("Error removing image:", error);
      setError(error.message);
      throw error;
    }
  };

  // Ask OpenAI for a checklist. Errors go to the caller, which shows a message
  // and keeps the form open.
  const breakDownTask = async () => {
    if (!task) throw new Error("No task found");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(BREAK_DOWN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({
        task_id: task.task_id,
        title: task.title,
        description: task.description,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to create steps");
    }

    // Only take the steps, so unsaved edits in the form are kept.
    setTask((prev) => (prev ? { ...prev, ai_steps: result.ai_steps } : null));
  };

  // Save the priority right away, like the steps, so it isn't lost if the user
  // leaves without pressing Save.
  const savePriority = async (priority: string) => {
    if (!task) throw new Error("No task found");

    const previousPriority = task.priority;
    setTask((prev) => (prev ? { ...prev, priority } : null));

    const { error } = await supabase
      .from("tasks")
      .update({ priority })
      .eq("task_id", task.task_id);

    if (error) {
      setTask((prev) =>
        prev ? { ...prev, priority: previousPriority } : null
      );
      throw error;
    }
  };

  // Save the checklist right away when a step is ticked.
  const saveSteps = async (steps: TaskStep[]) => {
    if (!task) throw new Error("No task found");

    const previousSteps = task.ai_steps;
    setTask((prev) => (prev ? { ...prev, ai_steps: steps } : null));

    const { error } = await supabase
      .from("tasks")
      .update({ ai_steps: steps })
      .eq("task_id", task.task_id);

    if (error) {
      setTask((prev) => (prev ? { ...prev, ai_steps: previousSteps } : null));
      throw error;
    }
  };

  // Task list operations
  const fetchTasks = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (title: string, description: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(FUNCTION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to create task"
        );
      }

      const taskData = await response.json();
      if (!taskData) throw new Error("No data returned from server");

      setTasks([taskData, ...tasks]);
      setError(null);
      return taskData;
    } catch (error: any) {
      console.error("Error creating task:", error);
      setError(error.message);
      throw error;
    }
  };

  const deleteTask = async (taskIdToDelete: string) => {
    try {
      // Supabase no longer lets the database delete stored files, so the
      // cleanup trigger from migration 3 fails for a task with an image.
      // Remove the image through the Storage API first, then delete the task.
      const taskToDelete = tasks.find((t) => t.task_id === taskIdToDelete);
      if (taskToDelete?.image_url) {
        const { error: storageError } = await supabase.storage
          .from("task-attachments")
          .remove([taskToDelete.image_url]);
        if (storageError) throw storageError;

        const { error: clearError } = await supabase
          .from("tasks")
          .update({ image_url: null })
          .eq("task_id", taskIdToDelete);
        if (clearError) throw clearError;
      }

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("task_id", taskIdToDelete);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.task_id !== taskIdToDelete));
      setError(null);
    } catch (error: any) {
      console.error("Error deleting task:", error);
      setError(error.message);
      throw error;
    }
  };

  const toggleTaskComplete = async (
    taskIdToToggle: string,
    completed: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed })
        .eq("task_id", taskIdToToggle);

      if (error) throw error;
      setTasks(
        tasks.map((t) =>
          t.task_id === taskIdToToggle ? { ...t, completed } : t
        )
      );
      setError(null);
    } catch (error: any) {
      console.error("Error updating task:", error);
      setError(error.message);
      throw error;
    }
  };

  const refreshTasks = async () => {
    setIsLoading(true);
    await fetchTasks();
  };

  return {
    // State
    task,
    tasks,
    date,
    userLabels,
    error,
    isLoading,

    // Single task operations
    setDate,
    updateTask,
    saveTask,
    uploadImage,
    removeImage,
    breakDownTask,
    saveSteps,
    savePriority,

    // Task list operations
    createTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks,
  };
}

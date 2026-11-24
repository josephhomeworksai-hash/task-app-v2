import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { getLabelColors } from "@/lib/labels";
import { getPriorityOption } from "@/lib/priorities";
import { Task } from "@/types/models";
import { useEffect, useState } from "react";

interface TaskRowProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

const TaskRow = ({ task, onDelete, onToggleComplete }: TaskRowProps) => {
  const formatDate = (dateString: string) => {
    return dateString.split("T")[0];
  };

  const priority = getPriorityOption(task.priority);

  // Deleting can't be undone, so the first click only arms the button.
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    onDelete(task.task_id);
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="py-2">
        <Checkbox
          checked={task.completed!}
          onCheckedChange={(checked) =>
            onToggleComplete(task.task_id, checked as boolean)
          }
        />
      </TableCell>
      <TableCell className="py-2 min-w-[6rem]">
        <Link
          href={`/task?id=${task.task_id}`}
          className={[
            // Break long words so a long title can't push the other columns
            // off the table.
            "hover:underline font-medium [overflow-wrap:anywhere]",
            task.completed ? "line-through text-muted-foreground" : "",
          ].join(" ")}
        >
          {task.title}
        </Link>
      </TableCell>
      <TableCell className="hidden sm:table-cell py-2">
        {task.label && (
          <Badge
            variant="outline"
            className={[
              getLabelColors(task.label)["bg-color"],
              getLabelColors(task.label)["text-color"],
              getLabelColors(task.label)["border-color"],
            ].join(" ")}
          >
            {task.label}
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-2">
        <Badge variant="outline" className={priority.className}>
          {priority.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell py-2 whitespace-nowrap">
        {task.due_date ? formatDate(task.due_date) : ""}
      </TableCell>
      <TableCell className="text-right py-2 whitespace-nowrap">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/task?id=${task.task_id}`}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Link>
        </Button>
        <Button
          variant={confirmDelete ? "destructive" : "ghost"}
          size={confirmDelete ? "sm" : "icon"}
          className={confirmDelete ? "h-8" : "h-8 w-8"}
          onClick={handleDeleteClick}
        >
          {confirmDelete ? (
            "Delete?"
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </>
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;

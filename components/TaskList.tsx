import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TaskRow from "./TaskRow";
import { Task } from "@/types/models";

interface TaskListProps {
  tasks: Task[];
  onDelete: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, completed: boolean) => Promise<void>;
}

const TaskList = ({ tasks, onDelete, onToggleComplete }: TaskListProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-8 sm:w-[50px] py-2"></TableHead>
          <TableHead className="py-2">Title</TableHead>
          {/* Label and due date are hidden on phones to leave room for the title. */}
          <TableHead className="hidden sm:table-cell w-[100px] py-2">
            Label
          </TableHead>
          <TableHead className="w-[90px] py-2">Priority</TableHead>
          <TableHead className="hidden sm:table-cell w-[120px] py-2">
            Due Date
          </TableHead>
          <TableHead className="w-[84px] sm:w-[100px] text-right py-2">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TaskRow
            key={task.task_id}
            task={task}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default TaskList;

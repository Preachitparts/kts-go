import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const users = [
  { id: "AD001", name: "Michael Quaicoe", email: "michaelquaicoe60@gmail.com", role: "Super-Admin" },
  { id: "AD002", name: "Jane Smith", email: "jane.smith@example.com", role: "Admin" },
  { id: "AD003", name: "John Johnson", email: "john.johnson@example.com", role: "Manager" },
  { id: "AD004", name: "Emily White", email: "emily.white@example.com", role: "Manager" },
];

export default function UsersTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.id}</TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'Super-Admin' ? 'destructive' : user.role === 'Admin' ? 'default' : 'secondary'}>
                  {user.role}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

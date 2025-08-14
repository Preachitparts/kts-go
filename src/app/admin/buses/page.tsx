import BusesTable from "@/components/admin/buses-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function BusesPage() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Buses</CardTitle>
                    <CardDescription>Add, edit, and manage your fleet of buses.</CardDescription>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Bus
                </Button>
            </CardHeader>
            <CardContent>
                <BusesTable />
            </CardContent>
        </Card>
    )
}

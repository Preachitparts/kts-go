
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function SettingsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Manage Hubtel payment gateway integration and other settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Configuration Notice</AlertTitle>
                    <AlertDescription>
                        Payment gateway settings are now managed directly in your project's environment variables (`.env` file). 
                        Please update your Hubtel API keys there. This page is no longer used for that purpose.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}

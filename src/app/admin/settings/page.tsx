"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
    hubtelSecret: z.string().min(1, "Secret is required."),
    hubtelClientId: z.string().min(1, "Client ID is required."),
    hubtelAccountId: z.string().min(1, "Account ID is required."),
});

export default function SettingsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            hubtelSecret: "d911cb1a8d7c46a1bae83f3ba803c787",
            hubtelClientId: "vDz5mM0",
            hubtelAccountId: "2030048",
        },
    });

    function onSubmit(values: z.infer<typeof settingsSchema>) {
        setIsLoading(true);
        setTimeout(() => {
            console.log("Updated settings:", values);
            toast({
                title: "Settings Updated",
                description: "Your changes have been saved successfully.",
            });
            setIsLoading(false);
        }, 1500);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Manage Hubtel payment gateway integration and other settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="hubtelSecret"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hubtel Payment Secret</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hubtelClientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hubtel Client ID</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hubtelAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hubtel Account ID</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

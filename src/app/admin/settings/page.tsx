
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const settingsSchema = z.object({
    liveMode: z.boolean().default(true),
    secretKey: z.string().min(1, "Secret is required."),
    clientId: z.string().min(1, "Client ID is required."),
    accountId: z.string().min(1, "Account ID is required."),
    testSecretKey: z.string().optional(),
    testClientId: z.string().optional(),
    testAccountId: z.string().optional(),
});

export default function SettingsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            liveMode: true,
            secretKey: "",
            clientId: "",
            accountId: "",
            testSecretKey: "",
            testClientId: "",
            testAccountId: "",
        },
    });

    const liveMode = form.watch("liveMode");

    useEffect(() => {
        const fetchSettings = async () => {
            setIsFetching(true);
            try {
                const settingsDoc = await getDoc(doc(db, "settings", "hubtel"));
                if (settingsDoc.exists()) {
                    form.reset(settingsDoc.data());
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not load Hubtel settings.",
                });
            } finally {
                setIsFetching(false);
            }
        };

        fetchSettings();
    }, [form, toast]);

    async function onSubmit(values: z.infer<typeof settingsSchema>) {
        setIsLoading(true);
        try {
            await setDoc(doc(db, "settings", "hubtel"), values);
            toast({
                title: "Settings Updated",
                description: "Your changes have been saved successfully.",
            });
        } catch (error) {
             console.error("Error saving settings:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save settings. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (isFetching) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Manage Hubtel payment gateway integration and other settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading settings...</span>
                    </div>
                </CardContent>
            </Card>
        )
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
                            name="liveMode"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Live Mode</FormLabel>
                                        <FormMessage />
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        
                        <Separator />
                        
                        <div>
                            <h3 className="text-lg font-medium mb-4">{liveMode ? "Live API Keys" : "Test API Keys"}</h3>
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name={liveMode ? "secretKey" : "testSecretKey"}
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
                                    name={liveMode ? "clientId" : "testClientId"}
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
                                    name={liveMode ? "accountId" : "testAccountId"}
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
                            </div>
                        </div>

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

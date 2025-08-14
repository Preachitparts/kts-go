"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { detectBookingAnomaly } from "@/ai/flows/booking-anomaly-detection";
import type { DetectBookingAnomalyOutput } from "@/ai/flows/booking-anomaly-detection";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  userActivities: z
    .string()
    .min(50, "Please provide a detailed description of at least 50 characters."),
});

export function AnomalyDetector() {
  const [result, setResult] = useState<DetectBookingAnomalyOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userActivities: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await detectBookingAnomaly(values);
      setResult(response);
    } catch (e: any) {
      setError("An error occurred while analyzing the data. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="userActivities"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">User Activities</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe user activities in detail. e.g., 'User booked 5 tickets for the same day from different IP addresses using multiple new accounts. Payment was made with a virtual credit card.'"
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Detect Anomaly"
            )}
          </Button>
        </form>
      </Form>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.anomalyDetected ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Anomaly Detected!</AlertTitle>
                <AlertDescription>
                  {result.anomalyDescription}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>No Anomaly Detected</AlertTitle>
                <AlertDescription>
                  The described activities appear to be normal.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div>
              <h3 className="text-lg font-semibold flex items-center mb-2">
                <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
                Recommendations for Operators
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {result.recommendations}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
